FROM python:3.12.12-alpine3.23

RUN apk add --no-cache tzdata

WORKDIR /app
COPY auto-archive.py /app/auto-archive.py
COPY entrypoint.sh /app/entrypoint.sh

RUN chmod 755 /app/auto-archive.py /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
