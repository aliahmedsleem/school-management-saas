# SchoolCloud — isolated staging deployment (NOT production)

The current app has demo screens and partial persistent academic operations. **Never enter real student or parent data** in this deployment. The schema is initialized via `create_all` solely for an empty disposable staging database, not a production migration.

## On Ubuntu server

Install Docker Engine + Compose plugin and configure an HTTPS reverse proxy. Run in a dedicated directory and avoid ports already used by existing services:

```bash
git clone --branch develop https://github.com/aliahmedsleem/school-management-saas.git
cd school-management-saas
cp .env.staging.example .env.staging
python3 -c 'import secrets; print(secrets.token_hex(32))'
# Edit .env.staging and replace SECRET_KEY with generated value.
docker compose -f compose.staging.yml build
docker compose -f compose.staging.yml run --rm schoolcloud python staging_init.py
docker compose -f compose.staging.yml up -d
curl -fsS http://127.0.0.1:8088/api/health
```

This binds only localhost port 8088. Do not expose it directly on the public Internet. Configure a *new* HTTPS Nginx virtual host with `proxy_pass http://127.0.0.1:8088;`, and only after testing TLS, host routing and access restrictions. Use an access-controlled staging hostname or VPN; do not reuse existing PORTEXA or Iraqi Business virtual hosts.

## Optional demo user

The CLI's `bootstrap-demo` is development-only. Do not enable it in a public staging environment. For a local test only, temporarily run an isolated development database following `docs/development.md`; do not insert real data.

## Updating

```bash
git pull --ff-only origin develop
docker compose -f compose.staging.yml up -d --build
```

Do not run `docker compose down -v` unless you intentionally want to destroy the staging database.

## Missing before production

Alembic migrations, PostgreSQL tenant isolation/RLS, comprehensive access controls, rate limiting, password recovery, real role portals, backups and restore testing, file security, audit logs, integration tests and an approved data protection process.
