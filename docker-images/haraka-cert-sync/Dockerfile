FROM python:3.11-alpine

RUN apk add --no-cache docker-cli

WORKDIR /app

COPY sync.py /app/sync.py
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
