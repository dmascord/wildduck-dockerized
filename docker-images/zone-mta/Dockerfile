FROM node:25.3.0-alpine3.23 as builder

ARG version=3.10.2
ARG wildduck_version=1.32.21

RUN apk add --no-cache git python3 make g++

WORKDIR /app

RUN git clone https://github.com/zone-eu/zone-mta-template ./

RUN npm install zone-mta@${version}
RUN npm install --production
RUN npm install zonemta-wildduck@${wildduck_version}


FROM node:25.3.0-alpine3.23 as app

ENV NODE_ENV production

RUN apk add --no-cache tini

WORKDIR /app
COPY --from=builder /app /app

ENTRYPOINT ["/sbin/tini", "--", "node", "index.js"]
CMD ["--config=config/zonemta.toml"]
