# SchoolCloud portal role rollout

Five experiences: (1) tenant owner assigns principals to schools; (2) principal manages school staff and academics; (3) registrar/deputy registers and enrolls students, manages family accounts; (4) teacher sees own assignments, roster, and grades; (5) one unified student/guardian portal with different backend permissions, guardian child switching, grades, timetable, attendance.

The React app no longer exposes demo role switching. Navigation derives from the authenticated membership; multi-role users must select a membership explicitly. Registrar cannot create principals or teachers, and principal cannot create another principal.

Important limitations: tenant owner is not a cross-tenant SaaS superadmin. Full global platform management, password recovery, invitations, audit trail, production database migrations, Iraqi result approval, reports and finance remain unfinished. Do not use real student data before security review.

## Staging rollout

```bash
cd ~/school-management-saas
git pull --ff-only origin develop
docker compose -f compose.staging.yml build schoolcloud
docker compose -f compose.staging.yml run --rm --no-deps schoolcloud python -m compileall -q app wsgi.py
docker compose -f compose.staging.yml up -d --no-deps --force-recreate schoolcloud
```

No new database tables in this batch. Verify login, school isolation, registrar permissions, teacher grade access, parent-child linking and logout with synthetic test data. Use HTTPS for credentials. Do not modify other containers.
