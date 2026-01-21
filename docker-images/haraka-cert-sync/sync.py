import base64
import json
import os
import subprocess
from pathlib import Path

ACME_PATH = Path(os.environ.get("ACME_PATH", "/traefik/acme.json"))
CERT_DOMAIN = os.environ.get("CERT_DOMAIN", "example.com")
HARAKA_CONTAINER = os.environ.get("HARAKA_CONTAINER", "wildduck-dockerized-haraka-1")
CERT_OUT = Path(os.environ.get("CERT_OUT", "/haraka/tls_cert.pem"))
KEY_OUT = Path(os.environ.get("KEY_OUT", "/haraka/tls_key.pem"))
RESOLVER = os.environ.get("CERT_RESOLVER")
ZONEMTA_CERT_OUT = os.environ.get("ZONEMTA_CERT_OUT")
ZONEMTA_KEY_OUT = os.environ.get("ZONEMTA_KEY_OUT")


def _load_acme():
    data = json.loads(ACME_PATH.read_text())
    if RESOLVER:
        return data.get(RESOLVER, {}).get("Certificates", [])
    # Try all resolvers until we find certificates
    for _, block in data.items():
        certs = block.get("Certificates", [])
        if certs:
            return certs
    return []


def _find_cert(certs):
    for cert in certs:
        domain = cert.get("domain", {})
        domains = [domain.get("main")] + (domain.get("sans") or [])
        if CERT_DOMAIN in domains:
            return cert
    return None


def _write_if_changed(path: Path, content: str, mode: int) -> bool:
    if path.exists() and path.read_text() == content:
        return False
    path.write_text(content)
    os.chmod(path, mode)
    return True


def main():
    if not ACME_PATH.exists():
        print(f"ACME file not found: {ACME_PATH}")
        return 1

    certs = _load_acme()
    if not certs:
        print("No certificates found in acme.json")
        return 1

    match = _find_cert(certs)
    if not match:
        print(f"No certificate found for {CERT_DOMAIN}")
        return 1

    cert_pem = base64.b64decode(match["certificate"]).decode("utf-8")
    key_pem = base64.b64decode(match["key"]).decode("utf-8")

    changed = False
    changed |= _write_if_changed(CERT_OUT, cert_pem, 0o640)
    changed |= _write_if_changed(KEY_OUT, key_pem, 0o600)

    zm_changed = False
    if ZONEMTA_CERT_OUT and ZONEMTA_KEY_OUT:
        zm_changed |= _write_if_changed(Path(ZONEMTA_CERT_OUT), cert_pem, 0o640)
        zm_changed |= _write_if_changed(Path(ZONEMTA_KEY_OUT), key_pem, 0o600)

    if changed or zm_changed:
        print("TLS material updated; restarting Haraka")
        subprocess.run(["docker", "restart", HARAKA_CONTAINER], check=False)
    else:
        print("TLS material unchanged")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
