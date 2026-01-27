# Wildduck: dockerized - 🦆+🐋=❤
The default docker-compose file will set up:

| Service          | Why                                                       | 
| ---------------- | --------------------------------------------------------- | 
| WildDuck         | IMAP, POP3                                                | 
| WildDuck Webmail | Webmail, creating accounts, <br> editing account settings | 
| ZoneMTA          | Outbound smtp (STARTTLS on 587)                           | 
| Haraka           | Inbound smtp                                              | 
| Rspamd           | Spam filtering                                            | 
| Traefik          | Reverse proxy with automatic TLS                          | 
| MongoDB          | Database used by most services                            | 
| Redis            | Key-value store used by most services                     | 
| Autodiscover     | Autoconfig / autodiscover endpoints                       | 
| Auto-Archive     | Scheduled mailbox archiving                               | 

For the default docker-compose file to work without any further setup, you need port 80/443 available for Traefik to get certificates or provide your own certificates mounted as a volume. However, the compose file is not set in stone. You can remove Traefik from the equation and use your own reverse proxy (or configure the applications to handle TLS directly), remove certain services, etc.

STARTTLS is enabled on port 587 for ZoneMTA.

Before starting please don't forget to install `Docker` and `Docker compose`

## Deploy Wildduck: dockerized
> For easy setup and startup use the provided `setup.sh` file (only works on Linux or Mac). The "wizard" provided by the script will ask necessary questions required for setting up the suite quickly and easily. The wizard will set up the configuration, secrets, self-signed certs (if required for development), optionally DNS and optionally will create the first user.

Keep in mind that the provided setup script is a basic setup that is intended to set you up quickly for either local development or testing, or to set you up with a simple working email suite on a server (such as a VPS). So for more granular configuration please refer to the appropriate documentation of the used applications and update the config files accordingly. Don't forget to restart the containers after configuration changes.

> Note! Haraka handles certificates completely separately. So in order to have Haraka with TLS you will need to either issue certs for Haraka/SMTP domain beforehand and include them in the specified folder that is set in the `docker-compose.yml` file or if using the provided `setup.sh` setup script there will be a cron created for you that will handle updating the haraka certs.

Additionally, the provided setup currently uses a very basic setup where all the services are run on the same domain. Ideally you'd want to run outbound SMTP (port 587), IMAP, POP3, inbound SMTP (port 25 Haraka) on different domains and have separate certs for them (Traefik will handle this for web/IMAPS/POP3S; Haraka uses the cert sync container described below). For database and redis sharding refer to Wildduck and Zone-MTA documentation.  
The provided setup also sets you up with basic DNS settings that "work right out the box". Additionally the provided setup script can create the first user for you. For user creation refer to Wildduck documentation at https://docs.wildduck.email.

## Connecting Thunderbird if using self-signed certificates
It may be required to import the generated CA file to Thunderbird in order for it
to connect to IMAP and SMTP. You can find the generated CA file in `config-generated/certs/rootCA.pem`.
If using letsencrypt on a publicly accessible DNS then Thunderbird should connect just fine
as with any other email server.

## Custom configuration
Configuration files for all services reside in `./config-generated`. Alter them in whichever way you want, and restart the service in question.

## STARTTLS on port 587 (ZoneMTA)
ZoneMTA is configured to advertise STARTTLS on port 587. The default config points to:

- `default-config/zone-mta/interfaces/feeder.toml`
  - `starttls = true`
  - `key = ./config/keys/smtp-key.pem`
  - `cert = ./config/keys/smtp-cert.pem`

The `haraka-cert-sync` container copies Traefik-managed certificates into these paths.

## Traefik + Haraka/ZoneMTA certificate sync
Traefik terminates TLS for HTTP/IMAPS/POP3S. Haraka and ZoneMTA need their own TLS material.
The `haraka-cert-sync` container reads Traefik's `acme.json`, extracts the cert for `CERT_DOMAIN`,
and writes:

- Haraka: `./config/haraka/tls_cert.pem` + `./config/haraka/tls_key.pem`
- ZoneMTA: `./config/zone-mta/keys/smtp-cert.pem` + `./config/zone-mta/keys/smtp-key.pem`

Set these variables in `.env` (see `example.env`). `CERT_RESOLVER` must match the Traefik resolver name:

- `CERT_DOMAIN` (domain in Traefik certs)
- `CERT_RESOLVER` (Traefik resolver name, default `letsencrypt`)
- `ACME_PATH` (defaults to `/traefik/acme.json` inside the container)
- `SYNC_SCHEDULE` (cron schedule for refresh)

When certs change, Haraka is restarted automatically. ZoneMTA reads the updated key/cert on next STARTTLS handshake.
If Traefik runs outside this compose file, override the `haraka-cert-sync` volume to mount the external `acme.json`.

## Haraka fixup_date plugin
This stack includes a custom Haraka plugin at `docker-images/haraka/fixup_date.js`. It ensures
inbound messages always have a valid `Date` header by capturing the arrival time and inserting
one when missing. The plugin is copied into the Haraka image during build and referenced in
`config/haraka/plugins` as `fixup_date`.

## Auto-archive
The `auto-archive` container runs a scheduled job that moves old mail into monthly archive folders.
Defaults can be set via environment variables in `.env`:

- `ARCHIVE_BASE`, `ARCHIVE_MONTHS`, `ARCHIVE_PATTERN`
- `ARCHIVE_ALL_FOLDERS`, `ARCHIVE_INCLUDE_BASE`, `ARCHIVE_USERS`, `ARCHIVE_PROGRESS`
- `ARCHIVE_SCHEDULE`

Per-user overrides are read from WildDuck `metaData` fields:
`autoArchiveEnabled`, `autoArchiveMonths`, `autoArchiveBase`, `autoArchivePattern`.

## DuckyAPI + Admin panel
This stack includes DuckyAPI and a Next.js admin UI for domain/account management.

- Admin UI: `https://<host>/admin`
- API base: `https://<host>/admin/api`

The API base path is set via `BASE_URL` in `config/duckyapi/production.env` and defaults to `admin/api`.

## Using the webmail fork (optional)
If you want the extended account settings (auto-archive UI), build webmail from the fork:

```
git clone git@github.com:dmascord/wildduck-webmail.git wildduck-webmail
docker compose -f docker-compose.yml -f docker-compose.webmail-fork.yml up -d --build wildduck-webmail
```

## Observability stack (optional)
To run OpenSearch + Graylog:

```
docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d
```

You must provide `GRAYLOG_PASSWORD_SECRET` and `GRAYLOG_ROOT_PASSWORD_SHA2` via environment variables.
See Graylog docs for generating these values. Do not commit them to Git.
