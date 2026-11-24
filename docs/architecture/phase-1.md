# Phase 1 architecture

- Modular Flask backend, React/TypeScript frontend, PostgreSQL production database.
- Tenant owns one or more schools. Users may hold scoped memberships.
- Iraqi national education system is the first seed; other countries/systems remain supported by the schema.
- Phase 1 scaffold only. Authentication, enforced tenant isolation (RLS), migrations, subscription enforcement, and security tests must be completed before production.
- Do not store real student information until access controls and data retention policies are implemented.
