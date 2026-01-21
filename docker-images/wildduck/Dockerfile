FROM node:25.3.0-alpine3.23 AS builder

ARG WILDDUCK_REPO=https://github.com/nodemailer/wildduck.git
ARG WILDDUCK_REF=master

RUN apk add --no-cache git python3 make g++

WORKDIR /wildduck
RUN git clone --depth=1 --branch ${WILDDUCK_REF} ${WILDDUCK_REPO} .
RUN npm install --production

FROM node:25.3.0-alpine3.23 AS app

RUN apk add --no-cache tini openssl

WORKDIR /wildduck
COPY --from=builder /wildduck /wildduck

ENTRYPOINT ["/sbin/tini", "--", "node", "server.js"]
CMD ["--config=/wildduck/config/default.toml"]
