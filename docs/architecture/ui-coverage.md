# UI coverage matrix — November 2026

All five role previews are represented in the Arabic RTL React navigation.

| Module | UI preview | Persistent backend |
|---|---|---|
| Platform overview, schools, subscriptions, plans, invoices | Yes | Schools list/create and subscription read only |
| Accounts, roles, audit, support | Yes | Not implemented |
| School setup, calendar, classes, subjects | Yes | Academic years, grades and sections list/create/edit only |
| Students and teachers | Yes | List/create/edit only |
| Student enrollment | Live academic workspace | List/create/edit only |
| Timetable, attendance, exams, grades, results | Yes | Not implemented |
| Curricula, resources, lessons, assignments | Yes | Not implemented |
| Guardians, messaging, notifications | Yes | Not implemented |
| Parent and student portal | Yes | Not implemented |
| Profile and settings | Yes | Not implemented |

## Limitations

- UI previews contain fabricated demo records and client-only additions; do not treat them as persisted.
- Live academic workspace is a separate switch within the frontend, not yet integrated into each preview page.
- No full end-to-end or production security verification has been performed.
- Database schema needs migrations, composite tenant constraints, PostgreSQL RLS, complete role permissions, audit logs, rate limiting and secure session deployment.
- School information and student data must not be imported until the above are completed.

## Verification

The repository contains GitHub Actions for Python pytest and Vite build. CI status must be checked on GitHub; a local clone/build could not be run in this environment due to network DNS restrictions.
