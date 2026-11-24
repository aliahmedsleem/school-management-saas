# UI modules — phase 1

The React interface is Arabic RTL and has distinct owner, principal, registrar, teacher, student and parent navigation. `frontend/src/access.ts` is the shared source for visible links and client-side page checks. It is a usability guard only; Flask endpoint decorators and tenant-scoped queries must remain the authorization boundary.

## Shared layout

- Responsive sidebar drawer with keyboard close, active-page state and a mobile overlay.
- Sticky workspace header with install control and unread notification shortcut.
- Shared notification state for the unread badge, inbox and optional voice readout; this avoids separate polling loops in each component.
- Notification preferences for browser push are attached to the signed-in tenant and account.

## Persisted and preview modules

The frontend connects to authenticated APIs for a subset of school, account, academic, attendance, homework and notification operations. Other dashboards and records remain previews or are incomplete; consult `ui-coverage.md` before treating a screen as a production workflow. Do not import real student records into this staging version.

## Next implementation milestones

1. Versioned database migrations and tenant-scoped database constraints/RLS.
2. Complete backend authorization review and endpoint-level audit coverage.
3. Pagination, consistent validation/errors, audit logs and operational monitoring.
4. Complete persisted student, teacher, family, timetable, exams and grades workflows.
5. Private file storage, account recovery, guardian verification and subscription billing.
6. Integration and accessibility checks across phone, tablet and desktop.
