# Learning module — staging rollout and acceptance

Implemented: subjects, section-teacher-subject assignments, weekly lesson slots, assessment grades, student/guardian read-only grades and schedules, teacher schedule, attendance, guardian links. All APIs use authenticated membership and tenant/school checks. Grade entry requires student enrollment in the assigned section.

## Important boundaries

- This is **not** a finished school ERP. The platform superadmin role, subscription enforcement, report cards, term-grade formulas, homework submission, exam scheduling, notifications, password recovery, per-school policies, audit trail, and parent verification remain unimplemented.
- Grade entry currently uses generic assessments and does not implement the Iraqi first/second exam round, annual effort, final exam, decision marks or approved result calculations.
- A teacher can enter grades only for assigned classes; attendance entry remains administrative.
- Timetable collisions are checked at the API level, but race-free database-level conflict constraints and production-grade migrations are still required.
- New tables are created with staging_init.py only on disposable staging. Back up the database first. Never run create_all as a production migration.
- The staging UI has not been confirmed with a real build or browser test in this conversation.

## Staging verification

```bash
cd ~/school-management-saas
git pull --ff-only origin develop
docker compose -f compose.staging.yml build schoolcloud
docker compose -f compose.staging.yml run --rm --no-deps schoolcloud python -m compileall -q app wsgi.py
# Only after backing up the disposable staging DB:
docker compose -f compose.staging.yml run --rm --no-deps schoolcloud python staging_init.py
docker compose -f compose.staging.yml up -d --no-deps --force-recreate schoolcloud
docker compose -f compose.staging.yml ps
```

Test using an HTTPS staging hostname and test-only data: create subject, assign teacher to section, create weekly lesson, enroll student, record grade, sign in as student and guardian, verify only linked student grades appear. Test unauthorized access to another school and that a teacher cannot assign subjects or modify another teacher's grades.

Never send live credentials over unencrypted HTTP. Flask recommends Secure, HttpOnly, SameSite session cookies and a correctly configured trusted reverse proxy. Do not enable ProxyFix unless the app is only reachable through the intended proxy.
