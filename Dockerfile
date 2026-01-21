FROM alpine:3.23.2

RUN apk add --no-cache bash

COPY ./ /setup

ENTRYPOINT [ "/setup/setup.sh" ]
