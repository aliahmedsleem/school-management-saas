# SchoolCloud PWA and responsive UI

The app includes a Web App Manifest, install control, PNG icons generated during the frontend build, and a small service worker. API requests are **never cached**. Offline support is limited to the app shell and previously fetched static assets; login, records, and school data require connectivity.

## Deploy the update to staging

```bash
cd ~/school-management-saas
git pull --ff-only origin develop
docker compose -f compose.staging.yml build schoolcloud
docker compose -f compose.staging.yml up -d --no-deps --force-recreate schoolcloud
curl -fsS http://127.0.0.1:8088/api/health
```

If staging is bound to LAN IP 192.168.100.10, use that address for the health check. Keep the LAN-only bind; do not expose staging to the public Internet.

## Installability

Browsers generally require a **secure context (trusted HTTPS)** for service workers and automatic PWA installation. `http://192.168.100.10:8088` is **not** a secure context. The app will explain manual home-screen shortcuts where available, but the full install prompt and offline shell require HTTPS. `http://localhost` is an exception for local development.

For staging, use an access-restricted HTTPS hostname behind Nginx with a trusted certificate and proxy to the existing bound port. Do not use real student data until access control and privacy review are complete.

On Android Chrome, open the HTTPS site and use the Install button or browser menu > Install app. On iOS Safari, use Share > Add to Home Screen. Verify installability with browser DevTools > Application > Manifest and Service Workers.
