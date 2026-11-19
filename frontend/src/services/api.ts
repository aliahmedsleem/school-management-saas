export type School = { id: string; name: string; country_code: string; timezone: string };
export type AcademicKind = "years" | "grades" | "sections" | "students" | "teachers" | "enrollments";
export type AcademicRow = Record<string, string>;
export type MembershipInfo = { id: string; role: string; school_id: string | null };
export type SessionInfo = { user: { id: string; email: string }; tenant_id: string; role: string; memberships?: MembershipInfo[] };
const BASE = "/api";
let csrfToken: string | null = null;

export class ApiError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}
async function call<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  if (!["GET", "HEAD", "OPTIONS"].includes(method) && csrfToken) headers.set("X-CSRF-Token", csrfToken);
  const response = await fetch(BASE + path, { ...options, headers, credentials: "same-origin" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, data.error || "request_failed");
  return data as T;
}
export const api = {
  login: async (email: string, password: string, tenant_id: string) => {
    const result = await call<SessionInfo & { csrf_token: string }>("/auth/login", {
      method: "POST", body: JSON.stringify({ email, password, tenant_id })
    });
    csrfToken = result.csrf_token;
    return result;
  },
  me: async () => { const result = await call<SessionInfo & { csrf_token: string }>("/auth/me"); csrfToken = result.csrf_token; return result; },
  logout: async () => { try { await call("/auth/logout", { method: "POST" }); } finally { csrfToken = null; } },
  portalContext: () => call<{role:string; school_id:string|null; memberships:MembershipInfo[]; schools:{id:string;name:string}[]}>("/portals/context"),
  selectMembership: (membership_id:string) => call<{role:string;school_id:string|null}>("/portals/select-membership", {method:"POST",body:JSON.stringify({membership_id})}),
  myStudents: () => call<{items:{id:string;full_name:string;student_code:string}[]}>("/portals/my-students"),
  myProfile: () => call<{id:string;name:string;code:string;school_id:string}>("/portals/my-profile"),
  schoolStudents: (school_id:string) => call<{items:{id:string;full_name:string;student_code:string}[]}>(`/portals/school-students?school_id=${encodeURIComponent(school_id)}`),
  schoolTeachers: (school_id:string) => call<{items:{id:string;full_name:string;employee_code:string}[]}>(`/portals/school-teachers?school_id=${encodeURIComponent(school_id)}`),
  linkGuardian: (membership_id:string,student_id:string) => call("/portals/guardians/link",{method:"POST",body:JSON.stringify({membership_id,student_id})}),
  accounts: () => call<{items:{id:string;email:string;role:string;school_id:string|null}[]}>("/portals/accounts"),
  createAccount: (data:{email:string;password:string;role:string;school_id:string;record_id?:string}) => call("/portals/accounts",{method:"POST",body:JSON.stringify(data)}),
  schools: () => call<{ items: School[] }>("/schools"),
  subscription: () => call<{ subscription: { id: string; status: string; plan_id: string } | null }>("/subscription"),
  addSchool: (name: string) => call<School>("/schools", { method: "POST", body: JSON.stringify({ name }) }),
  list: (kind: AcademicKind, school_id: string) =>
    call<{ items: AcademicRow[] }>(`/academics/${kind}?school_id=${encodeURIComponent(school_id)}`),
  update: (kind: AcademicKind, id: string, values: AcademicRow) =>
    call<AcademicRow>(`/academics/${kind}/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(values) }),
  create: (kind: AcademicKind, values: AcademicRow) =>
    call<AcademicRow>(`/academics/${kind}`, { method: "POST", body: JSON.stringify(values) }),
};
