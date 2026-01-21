#!/bin/sh
set -eu

: "${SYNC_SCHEDULE:=15 * * * *}"
: "${SYNC_LOG:=/var/log/haraka-cert-sync.log}"

mkdir -p /var/log

echo "$SYNC_SCHEDULE /usr/local/bin/python /app/sync.py >> $SYNC_LOG 2>&1" > /etc/crontabs/root

/usr/local/bin/python /app/sync.py >> $SYNC_LOG 2>&1 || true

exec crond -f -l 2
