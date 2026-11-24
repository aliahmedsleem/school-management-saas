# School Management SaaS

Multi-tenant, multi-country school management platform. Initial pilot: Iraq.

Stack: Flask, PostgreSQL, React, TypeScript.

Development happens on the `develop` branch.

## Student records rollout

Student profile fields and opaque, globally unique QR identifiers are added with an additive staging migration. Back up the staging SQLite database, build the new image, then run `flask --app wsgi:app migrate-student-profiles` against the staging volume before exposing the updated application. Existing students receive a QR identifier and empty guardian/contact fields; the migration does not delete or rewrite existing student records. A QR identifier does not authenticate a student or guardian.
