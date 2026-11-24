export type School = { id: string; name: string; country_code: string; timezone: string };
export type AcademicKind = "years" | "grades" | "sections" | "students" | "teachers" | "enrollments";
export type AcademicRow = Record<string, string>;
export type MembershipInfo = { id: string; role: string; school_id: string | null };
export type SessionInfo = { user: { id: string; email: string }; tenant_id: string; role: string; memberships?: MembershipInfo[] };
export type Notice = { id: string; kind: string; title: string; body: string; target_path: string; created_at: string; read_at: string | null };
export type PushSubscriptionPayload = { endpoint: string; expirationTime: number | null; keys: { p256dh: string; auth: string } };
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
  login: async (email: string, password: string, tenant_id?: string) => {
    const result = await call<SessionInfo & { csrf_token: string }>("/auth/login", {
      method: "POST", body: JSON.stringify({ email, password, tenant_id })
    });
    csrfToken = result.csrf_token;
    return result;
  },
  me: async () => { const result = await call<SessionInfo & { csrf_token: string }>("/auth/me"); csrfToken = result.csrf_token; return result; },
  pending: async () => {const result=await call<{user:{id:string;email:string};tenant_id:string;memberships:MembershipInfo[];selection_required:boolean;csrf_token:string}>("/auth/pending");csrfToken=result.csrf_token;return result;},
  logout: async () => {
    try {
      try {
        if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
          const registration = await navigator.serviceWorker.getRegistration("/");
          const subscription = await registration?.pushManager?.getSubscription();
          if (subscription) {
            try { await call("/notifications/subscriptions/current", { method: "DELETE", body: JSON.stringify({ endpoint: subscription.endpoint }) }); }
            catch { /* Continue logout if the push endpoint is already unavailable. */ }
            try { await subscription.unsubscribe(); } catch { /* The server session must still be closed. */ }
          }
        }
      } catch { /* Push cleanup is best-effort; it must not block account logout. */ }
      await call("/auth/logout", { method: "POST" });
    } finally { csrfToken = null; }
  },
  portalContext: () => call<{role:string; school_id:string|null; memberships:MembershipInfo[]; schools:{id:string;name:string}[]}>("/portals/context"),
  selectMembership: (membership_id:string) => call<{role:string;school_id:string|null}>("/portals/select-membership", {method:"POST",body:JSON.stringify({membership_id})}),
  schoolQr: () => call<{token:string;school_id:string;school_name:string;expires_in_seconds:number}>("/portals/school-qr"),
  resolveSchoolQr: (token:string) => call<{school_id:string;school_name:string;tenant_id:string;verification_required:boolean}>(`/portals/school-qr/resolve?token=${encodeURIComponent(token)}`),
  myStudents: () => call<{items:{id:string;full_name:string;student_code:string}[]}>("/portals/my-students"),
  myProfile: () => call<{id:string;name:string;code:string;school_id:string}>("/portals/my-profile"),
  learningCatalog: (school_id:string) => call<{subjects:{id:string;name:string}[];assignments:{id:string;section_id:string;teacher_id:string;subject_id:string}[]}>(`/learning/catalog?school_id=${encodeURIComponent(school_id)}`),
  learningSubject: (data:{school_id:string;name:string}) => call("/learning/subjects",{method:"POST",body:JSON.stringify(data)}),
  learningAssignment: (data:{school_id:string;section_id:string;teacher_id:string;subject_id:string}) => call("/learning/assignments",{method:"POST",body:JSON.stringify(data)}),
  learningTimetable: (data:{school_id:string;assignment_id:string;weekday:number;period:number}) => call("/learning/timetable",{method:"POST",body:JSON.stringify(data)}),
  learningGrade: (data:{school_id:string;student_id:string;assignment_id:string;assessment:string;score:number;max_score:number}) => call("/learning/grades",{method:"POST",body:JSON.stringify(data)}),
  teacherRoster: (assignment_id:string) => call<{items:{id:string;name:string;student_code:string}[]}>(`/learning/teacher-roster?assignment_id=${encodeURIComponent(assignment_id)}`),
  learningMine: () => call<{grades:{student_id:string;subject:string;assessment:string;score:number;max_score:number}[];timetable:{assignment_id:string;subject?:string;weekday:number;period:number}[];students?:{id:string;name:string}[];assignments?:{id:string;section_id:string;subject_id:string;school_id:string;subject:string;section:string}[]}>("/learning/mine"),
  attendanceSchool: (school_id:string,day:string) => call<{items:{id:string;student_id:string;day:string;status:string;note:string}[]}>(`/attendance/school?school_id=${encodeURIComponent(school_id)}&day=${encodeURIComponent(day)}`),
  attendanceSave: (data:{school_id:string;student_id:string;day:string;status:string;note:string}) => call("/attendance/school",{method:"POST",body:JSON.stringify(data)}),
  attendanceMine: (student_id?:string) => call<{items:{id:string;student_id:string;day:string;status:string;note:string}[]}>(`/attendance/mine${student_id?`?student_id=${encodeURIComponent(student_id)}`:""}`),
  schoolStudents: (school_id:string) => call<{items:{id:string;full_name:string;student_code:string}[]}>(`/portals/school-students?school_id=${encodeURIComponent(school_id)}`),
  schoolTeachers: (school_id:string) => call<{items:{id:string;full_name:string;employee_code:string}[]}>(`/portals/school-teachers?school_id=${encodeURIComponent(school_id)}`),
  linkGuardian: (membership_id:string,student_id:string) => call("/portals/guardians/link",{method:"POST",body:JSON.stringify({membership_id,student_id})}),
  accounts: () => call<{items:{id:string;email:string;role:string;school_id:string|null}[]}>("/portals/accounts"),
  createAccount: (data:{email:string;password:string;role:string;school_id:string;record_id?:string}) => call("/portals/accounts",{method:"POST",body:JSON.stringify(data)}),
  homeworkList: () => call<{items:{id:string;assignment_id:string;school_id:string;title:string;description:string;due_at:string;created_at:string}[]}>("/homework"),
  homeworkCreate: (data:{assignment_id:string;title:string;description:string;due_at:string}) => call<{item:{id:string};recipients:number}>("/homework",{method:"POST",body:JSON.stringify(data)}),
  notifications: () => call<{items:Notice[];unread:number}>("/notifications"),
  notificationRead: (id:string) => call(`/notifications/${encodeURIComponent(id)}/read`,{method:"POST"}),
  pushConfig: () => call<{enabled:boolean;public_key:string|null}>("/notifications/push-config"),
  pushSubscriptions: () => call<{items:{id:string}[]}>("/notifications/subscriptions"),
  savePushSubscription: (subscription:PushSubscriptionPayload) => call<{id:string;enabled:boolean}>("/notifications/subscriptions",{method:"POST",body:JSON.stringify(subscription)}),
  removePushSubscription: (id:string) => call<{ok:boolean}>(`/notifications/subscriptions/${encodeURIComponent(id)}`,{method:"DELETE"}),
  removeCurrentPushSubscription: (endpoint:string) => call<{ok:boolean}>("/notifications/subscriptions/current",{method:"DELETE",body:JSON.stringify({endpoint})}),
  ownerOverview: () => call<{tenant:{id:string;name:string;status:string}|null;schools_count:number;accounts_count:number;subscription_status:string|null;schools:{id:string;name:string}[]}>("/owner/overview"),
  schools: () => call<{ items: School[] }>("/schools"),
  subscriptionPlans: () => call<{items:{id:string;code:string;name:string;price_minor:number;currency:string}[]}>("/subscription/plans"),
  subscription: () => call<{ subscription: { id: string; status: string; plan_id: string } | null }>("/subscription"),
  addSchool: (name: string) => call<School>("/schools", { method: "POST", body: JSON.stringify({ name }) }),
  list: (kind: AcademicKind, school_id: string) =>
    call<{ items: AcademicRow[] }>(`/academics/${kind}?school_id=${encodeURIComponent(school_id)}`),
  update: (kind: AcademicKind, id: string, values: AcademicRow) =>
    call<AcademicRow>(`/academics/${kind}/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(values) }),
  create: (kind: AcademicKind, values: AcademicRow) =>
    call<AcademicRow>(`/academics/${kind}`, { method: "POST", body: JSON.stringify(values) }),
};
