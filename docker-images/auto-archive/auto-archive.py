#!/usr/bin/env python3
import calendar
import datetime as dt
import json
import os
import sys
import urllib.parse
import urllib.request

BASE_URL = os.environ.get("WILDDUCK_API", "http://127.0.0.1:8080")
ARCHIVE_BASE = os.environ.get("ARCHIVE_BASE", "Archives")
MONTHS = int(os.environ.get("ARCHIVE_MONTHS", "3"))
DRY_RUN = os.environ.get("DRY_RUN", "").lower() in {"1", "true", "yes"}
DEFAULT_PATTERN = os.environ.get("ARCHIVE_PATTERN", "{base}/{year}/{month}")
ALL_FOLDERS = os.environ.get("ARCHIVE_ALL_FOLDERS", "").lower() in {"1", "true", "yes"}
INCLUDE_BASE = os.environ.get("ARCHIVE_INCLUDE_BASE", "").lower() in {"1", "true", "yes"}
ARCHIVE_USERS = {
    value.strip().lower()
    for value in os.environ.get("ARCHIVE_USERS", "").split(",")
    if value.strip()
}
ARCHIVE_PROGRESS = os.environ.get("ARCHIVE_PROGRESS", "").lower() in {"1", "true", "yes"}


def api_request(method, path, params=None, data=None):
    url = urllib.parse.urljoin(BASE_URL, path)
    if params:
        url += "?" + urllib.parse.urlencode(params)
    headers = {"Content-Type": "application/json"}
    body = None
    if data is not None:
        body = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(url, method=method, data=body, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            payload = resp.read().decode("utf-8")
            return json.loads(payload) if payload else {}
    except urllib.error.HTTPError as exc:
        details = exc.read().decode("utf-8")
        raise RuntimeError(f"{method} {url} failed: {exc.code} {details}") from exc


def subtract_months(ts, months):
    year = ts.year
    month = ts.month - months
    while month <= 0:
        month += 12
        year -= 1
    day = min(ts.day, calendar.monthrange(year, month)[1])
    return ts.replace(year=year, month=month, day=day)


def month_start(ts):
    return ts.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def next_month(ts):
    year = ts.year + (1 if ts.month == 12 else 0)
    month = 1 if ts.month == 12 else ts.month + 1
    return ts.replace(year=year, month=month, day=1, hour=0, minute=0, second=0, microsecond=0)


def iso(ts):
    return ts.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def get_users():
    next_cursor = None
    while True:
        params = {"limit": 100, "metaData": "true"}
        if next_cursor:
            params["next"] = next_cursor
        data = api_request("GET", "/users", params=params)
        for user in data.get("results", []):
            yield user
        next_cursor = data.get("nextCursor")
        if not next_cursor:
            break


def ensure_mailbox(user_id, mailbox_map, path):
    if path in mailbox_map:
        return mailbox_map[path]
    if DRY_RUN:
        print(f"[dry-run] create mailbox {user_id} {path}")
        return None
    resp = api_request("POST", f"/users/{user_id}/mailboxes", data={"path": path})
    if not resp.get("success"):
        raise RuntimeError(f"Failed to create mailbox {path}: {resp}")
    mailbox_id = resp.get("id")
    mailbox_map[path] = mailbox_id
    return mailbox_id


def fetch_mailboxes(user_id):
    resp = api_request("GET", f"/users/{user_id}/mailboxes")
    mailbox_map = {}
    id_to_path = {}
    inbox_id = None
    mailboxes = []
    for mb in resp.get("results", []):
        mailbox_map[mb["path"]] = mb["id"]
        id_to_path[mb["id"]] = mb["path"]
        mailboxes.append(mb)
        if mb["path"].upper() == "INBOX":
            inbox_id = mb["id"]
    return mailbox_map, id_to_path, inbox_id, mailboxes


def get_oldest_idate(user_id, mailbox_id):
    resp = api_request(
        "GET",
        f"/users/{user_id}/mailboxes/{mailbox_id}/messages",
        params={"limit": 1, "order": "asc"},
    )
    results = resp.get("results", [])
    if not results:
        return None
    idate = results[0].get("idate")
    if not idate:
        return None
    return dt.datetime.fromisoformat(idate.replace("Z", "+00:00")).astimezone(dt.timezone.utc)


def move_messages(user_id, source_id, target_id, start_ts, end_ts, source_path, target_path):
    payload = {
        "mailbox": source_id,
        "datestart": iso(start_ts),
        "dateend": iso(end_ts),
        "action": {"moveTo": target_id},
    }
    if DRY_RUN:
        print(f"[dry-run] move {user_id} {payload}")
        return 1
    resp = api_request("POST", f"/users/{user_id}/search", data=payload)
    if not resp.get("success"):
        raise RuntimeError(f"Search move failed: {resp}")
    if ARCHIVE_PROGRESS:
        print(
            "[progress] user=%s source=%s target=%s range=%s..%s"
            % (user_id, source_path, target_path, start_ts.date().isoformat(), end_ts.date().isoformat())
        )
    return 1


def build_archive_path(base_path, pattern, ts):
    return pattern.format(
        base=base_path,
        year=ts.year,
        month=f"{ts.month:02d}",
        day=f"{ts.day:02d}",
    )


def get_user_setting(meta, key, default):
    if not isinstance(meta, dict):
        return default
    return meta.get(key, default)


def should_archive_mailbox(path, special_use, base_path):
    if path.upper() == "INBOX":
        return True
    if special_use:
        return False
    if not INCLUDE_BASE and (path.startswith(base_path + "/") or path == base_path):
        return False
    return True


def should_archive_user(user):
    if not ARCHIVE_USERS:
        return True
    user_id = str(user.get("id", "")).lower()
    username = str(user.get("username", "")).lower()
    return user_id in ARCHIVE_USERS or username in ARCHIVE_USERS


def main():
    now = dt.datetime.now(dt.timezone.utc)
    total_scheduled = 0
    for user in get_users():
        if not should_archive_user(user):
            continue
        user_id = user["id"]
        meta = user.get("metaData") or {}
        enabled = get_user_setting(meta, "autoArchiveEnabled", True)
        if enabled is False:
            continue
        months = int(get_user_setting(meta, "autoArchiveMonths", MONTHS))
        base_path = get_user_setting(meta, "autoArchiveBase", ARCHIVE_BASE)
        pattern = get_user_setting(meta, "autoArchivePattern", DEFAULT_PATTERN)
        cutoff = subtract_months(now, months)
        mailbox_map, id_to_path, inbox_id, mailboxes = fetch_mailboxes(user_id)
        if not inbox_id:
            continue
        sources = [m for m in mailboxes if should_archive_mailbox(m["path"], m.get("specialUse"), base_path)]
        if not ALL_FOLDERS:
            sources = [m for m in sources if m["path"].upper() == "INBOX"]
        user_scheduled = 0
        for src in sources:
            source_id = src["id"]
            oldest = get_oldest_idate(user_id, source_id)
            if not oldest or oldest >= cutoff:
                continue
            cursor = month_start(oldest)
            while cursor < cutoff:
                end = min(next_month(cursor), cutoff)
                archive_path = build_archive_path(base_path, pattern, cursor)
                target_id = ensure_mailbox(user_id, mailbox_map, archive_path)
                if target_id:
                    user_scheduled += move_messages(
                        user_id,
                        source_id,
                        target_id,
                        cursor,
                        end,
                        id_to_path.get(source_id, source_id),
                        id_to_path.get(target_id, archive_path),
                    )
                cursor = next_month(cursor)
        total_scheduled += user_scheduled
        if ARCHIVE_PROGRESS:
            print("[progress] user=%s scheduled=%d" % (user_id, user_scheduled))
    if ARCHIVE_PROGRESS:
        print("[progress] total_scheduled=%d" % total_scheduled)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"auto-archive failed: {exc}", file=sys.stderr)
        sys.exit(1)
