# Role portals and staged verification

## Current roles and enforced endpoints

| Role | Server-side access |
| --- | --- |
| owner | Tenant-wide schools, academic CRUD, account creation, subscription |
| principal | Scoped school academic CRUD and school accounts |
| registrar | Scoped academic CRUD |
| teacher | Only linked teacher profile (other modules pending) |
| student | Only linked student profile (other modules pending) |
| parent | Only explicitly linked students (other modules pending) |

The role dropdown in preview mode is **not authentication**. Switch to live API mode and log in. A session is always authorized by the server, not the dropdown. An account needs an existing tenant membership and (for student/teacher) an explicit link to a school record.

## Safe staging upgrade

Before updating, create a copy of your staging volume or database. Then:

```bash
cd ~/school-management-saas
git pull --ff-only origin develop
docker compose -f compose.staging.yml build schoolcloud
docker compose -f compose.staging.yml run --rm --no-deps schoolcloud python -m compileall -q app wsgi.py
docker compose -f compose.staging.yml run --rm --no-deps schoolcloud python staging_init.py
docker compose -f compose.staging.yml up -d --no-deps --force-recreate schoolcloud
docker compose -f compose.staging.yml ps
```

`staging_init.py` uses `create_all` only to create missing tables in the **disposable staging database**. It does not alter existing tables and is **not a production migration strategy**. The current implementation must not be used for real student records.

## Acceptance checks

1. Unauthenticated `GET /api/portals/context` returns 401.
2. Log in as an owner: schools, accounts and subscriptions are visible; create a school and school-scoped principal account.
3. Log in as principal: see only the assigned school, create teacher/student/parent accounts with links to existing school records.
4. Log in as student: see only their linked student profile; `GET /api/academics/students?school_id=...` returns 403.
5. Log in as parent: see only linked children; academic CRUD and accounts endpoints return 403.
6. Test a school-scoped user against another tenant's school ID: no data should be returned.
7. Test browser on desktop and mobile; verify the PWA install control.

**Not implemented:** timetable, exams, attendance, teacher assignments, grades, guardian self-service, password reset, platform-wide superadmin, full per-school role management, rate limiting, RLS and production migrations. UI page availability is not a substitute for backend authorization.
