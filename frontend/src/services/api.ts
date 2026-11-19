export type School = { id: string; name: string; country_code: string; timezone: string };
export type AcademicKind = "years" | "grades" | "sections" | "students" | "teachers" | "enrollments";
export type AcademicRow = Record<string, string>;
export type SessionInfo = { user: { id: string; email: string }; tenant_id: string; role: string };
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
  me: () => call<SessionInfo>("/auth/me"),
  logout: async () => { try { await call("/auth/logout", { method: "POST" }); } finally { csrfToken = null; } },
  schools: () => call<{ items: School[] }>("/schools"),
  addSchool: (name: string) => call<School>("/schools", { method: "POST", body: JSON.stringify({ name }) }),
  list: (kind: AcademicKind, school_id: string) =>
    call<{ items: AcademicRow[] }>(`/academics/${kind}?school_id=${encodeURIComponent(school_id)}`),
  create: (kind: AcademicKind, values: AcademicRow) =>
    call<AcademicRow>(`/academics/${kind}`, { method: "POST", body: JSON.stringify(values) }),
};
