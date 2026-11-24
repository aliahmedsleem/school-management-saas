# PWA and notifications

## Current behavior

- The Arabic RTL interface uses one role navigation map. It controls visible links and the client-side route guard; Flask's `require_membership` decorators remain the real access control.
- The notification center and unread badge share one authenticated inbox poller. It checks while the page is visible and refreshes on focus. API responses and student data are never cached by the service worker.
- The service worker caches the app shell and same-origin static assets, and displays Web Push notifications with a same-origin click target. Offline mode is limited to the shell and already cached frontend assets; login and school records still require a connection.
- Push registrations are per browser/device and scoped to the signed-in tenant and user. Removing an account session does not revoke browser permission, but the next account registration rebinds the same endpoint to that account.

## Enable Web Push

Web Push requires a trusted HTTPS origin, a browser that supports Push API, and the app installed on iOS/iPadOS. Android browsers can subscribe without installation. Set these values in the server environment; never commit the private key:

```dotenv
VAPID_PUBLIC_KEY=<public application-server key>
VAPID_PRIVATE_KEY=<private application-server key>
VAPID_CLAIMS_SUB=mailto:admin@example.org
```

The public key is returned only to an authenticated session. The server accepts HTTPS push endpoints from FCM, Mozilla Push Service, and Apple Push Service. A failed endpoint is retried with backoff; expired endpoints are removed. Pending push work is written to `push_outbox` in the same transaction as the inbox notification.

On a fresh staging database, `staging_init.py` creates the notification, subscription, and outbox tables. If notifications were initialized separately on an existing development database, run:

```bash
cd backend
flask --app wsgi init-communication-tables
```

Schedule the dispatcher once per minute in the same environment as the Flask app:

```bash
cd backend
flask --app wsgi deliver-push-notifications --limit 50
```

The command is safe to rerun. It stops retrying an item after eight failed attempts and records that item in the failed state for later inspection. The application does not start a background worker inside Gunicorn, so deployments must schedule the command explicitly.

## Browser and device checks

1. Serve the app from a trusted HTTPS hostname and confirm `/manifest.webmanifest`, `/sw.js`, and both generated PNG icons return successfully.
2. Install SchoolCloud from the browser. On iOS, install from Safari's Share menu before enabling push.
3. Open the notification center and grant browser permission for this device. Denying permission requires changing it in browser settings before retrying.
4. Create a notification through an existing school workflow, run the dispatcher, and open the system notification to verify it returns to the same-origin page.
5. Verify notifications work on a narrow phone viewport, landscape, tablet and desktop; offline shell should open, while API-backed pages should show that connectivity is required.

Push delivery remains best-effort and depends on browser, device and operating-system policies. The database inbox is the durable record; push is a prompt to return to it.
