# UI modules — phase 1

The React UI provides Arabic RTL role previews for platform administrator, school administrator, teacher, parent and student.

## Preview-only functionality
- Sidebar navigation and responsive mobile drawer
- Overview cards and timetable day switching
- Tables, client-side search, local record creation
- Parent child selector
- School settings fields

No UI data is persisted. No authentication or authorization is enforced by this preview. The UI must not be deployed with real school data until API authorization and tenant isolation are implemented.

## Next implementation milestones
1. PostgreSQL migration, tenant-scoped foreign keys and RLS policies
2. Authentication, sessions, CSRF and authorization
3. CRUD APIs with pagination, validation and audit logs
4. React Query API integration and typed client
5. File uploads with private object storage
6. Grades approval/publication workflow and guardian verification
7. Subscription billing and payment verification
8. Integration tests and security review
