# UI coverage matrix — November 2026

The six role menus and client-side page checks share `frontend/src/access.ts`. Backend route decorators and tenant-scoped database queries are still authoritative; hiding a link is not an authorization control.

All six role portals are represented in the Arabic RTL React navigation.

| Module | UI preview | Persistent backend |
|---|---|---|
| Platform overview, schools, subscriptions, plans, invoices | Yes | Tenant owner overview, schools list/create and subscription read only |
| Accounts and role assignment | Yes | List/create with backend role checks; audit and support are not implemented |
| School setup, calendar, classes, subjects | Yes | Academic years, grades and sections list/create/edit only |
| Students and teachers | Yes | List/create/edit only |
| Student enrollment | Live academic workspace | List/create/edit only |
| Timetable, attendance, exams, grades, results | Yes | Not implemented |
| Curricula, resources, lessons, assignments | Yes | Not implemented |
| Guardians and messaging | Yes | Guardian linking and homework-related messaging are partial |
| Notification inbox and read state | Yes | Tenant/user-scoped inbox, read action and outbox creation |
| Browser push subscriptions | Yes | Device-scoped subscription APIs; push dispatch requires VAPID keys and a scheduled worker |
| Parent and student portal | Yes | Not implemented |
| Profile and settings | Yes | Not implemented |

## Limitations

- Several UI previews contain fabricated demo records and client-only additions; do not treat them as persisted.
- Live academic workspace is a separate switch within the frontend, not yet integrated into each preview page.
- No full end-to-end or production security verification has been performed.
- Database schema needs migrations, composite tenant constraints, PostgreSQL RLS, complete role permissions, audit logs, rate limiting and secure session deployment.
- School information and student data must not be imported until the above are completed.

## Verification

The repository contains GitHub Actions for Python pytest and Vite build. The frontend production build was run locally for this change; backend tests were not run.
