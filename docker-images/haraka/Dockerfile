FROM node:25.3.0-alpine3.23 as builder

ARG version=v3.1.1
ARG plugin_version=5.8.28

RUN apk add --no-cache git python3 make g++

WORKDIR /app

RUN git clone https://github.com/haraka/Haraka.git ./ --branch ${version}
RUN npm install --production
RUN npm install haraka-plugin-wildduck@${plugin_version}


FROM node:25.3.0-alpine3.23 as app

ENV NODE_ENV production

RUN apk add --no-cache tini

WORKDIR /app
COPY --from=builder /app /app

COPY fixup_date.js /app/plugins/fixup_date.js

ENTRYPOINT ["/sbin/tini", "--", "node", "haraka.js"]
