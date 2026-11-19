import React, { useEffect, useState } from "react";
import { api, type AcademicKind, type AcademicRow, type School, type SessionInfo } from "../services/api";
import "./academic.css";

const kinds: { key: AcademicKind; title: string; fields: { name: string; label: string }[] }[] = [
  { key: "years", title: "الأعوام الدراسية", fields: [{ name: "name", label: "اسم العام" }] },
  { key: "grades", title: "الصفوف", fields: [{ name: "name", label: "اسم الصف" }, { name: "stage", label: "المرحلة" }] },
  { key: "sections", title: "الشعب", fields: [{ name: "name", label: "اسم الشعبة" }, { name: "grade_level_id", label: "معرف الصف" }] },
  { key: "students", title: "الطلبة", fields: [{ name: "full_name", label: "اسم الطالب" }, { name: "student_code", label: "الرقم المدرسي" }] },
  { key: "teachers", title: "المدرسون", fields: [{ name: "full_name", label: "اسم المدرس" }, { name: "employee_code", label: "الرقم الوظيفي" }] },
  { key: "enrollments", title: "تسجيل الطلبة", fields: [{ name: "student_id", label: "معرف الطالب" }, { name: "academic_year_id", label: "معرف العام" }, { name: "section_id", label: "معرف الشعبة" }] },
];
const errors: Record<string, string> = {
  invalid_credentials: "بيانات الدخول غير صحيحة أو الحساب غير مرتبط بالمدرسة",
  forbidden: "لا تملك صلاحية تنفيذ هذه العملية",
  csrf_required: "انتهت صلاحية جلسة الحماية، سجّل الدخول مجدداً",
  school_not_found: "المدرسة غير موجودة أو غير مصرح لك بالوصول إليها",
  duplicate_or_invalid_record: "السجل مكرر أو يحتوي على مراجع غير صالحة",
  invalid_reference: "المرجع المحدد لا يتبع هذه المدرسة",
};
function message(e: unknown) { return errors[e instanceof Error ? e.message : ""] || "تعذّر تنفيذ الطلب. تحقق من الاتصال والبيانات."; }

export default function AcademicWorkspace() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenant, setTenant] = useState("");
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolId, setSchoolId] = useState("");
  const [kind, setKind] = useState<AcademicKind>("students");
  const [rows, setRows] = useState<AcademicRow[]>([]);
  const [form, setForm] = useState<AcademicRow>({});
  const [schoolName, setSchoolName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [references, setReferences] = useState<Record<string, AcademicRow[]>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selected = kinds.find(k => k.key === kind)!;

  async function loadSchools() {
    const result = await api.schools();
    setSchools(result.items);
    setSchoolId(current => result.items.some(s => s.id === current) ? current : (result.items[0]?.id || ""));
  }
  useEffect(() => { api.me().then(setSession).catch(() => {}); }, []);
  useEffect(() => { if (session) loadSchools().catch(e => setError(message(e))); }, [session]);
  useEffect(() => {
    if (!session || !schoolId) { setRows([]); return; }
    let cancelled = false;
    api.list(kind, schoolId).then(r => { if (!cancelled) setRows(r.items); }).catch(e => { if (!cancelled) setError(message(e)); });
    return () => { cancelled = true; };
  }, [session, schoolId, kind]);
  async function login(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try { const result = await api.login(email, password, tenant); setSession(result); setPassword(""); }
    catch (e) { setError(message(e)); } finally { setBusy(false); }
  }
  useEffect(() => {
    if (!session || !schoolId) { setReferences({}); return; }
    let cancelled = false;
    Promise.all((["grades","students","years","sections"] as AcademicKind[]).map(async key => [key, (await api.list(key, schoolId)).items] as const))
      .then(entries => { if (!cancelled) setReferences(Object.fromEntries(entries)); })
      .catch(e => { if (!cancelled) setError(message(e)); });
    return () => { cancelled = true; };
  }, [session, schoolId, kind]);
  async function create(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try { if (editingId) await api.update(kind, editingId, form); else await api.create(kind, { ...form, school_id: schoolId }); setEditingId(null); setForm({}); setRows((await api.list(kind, schoolId)).items); }
    catch (e) { setError(message(e)); } finally { setBusy(false); }
  }
  async function addSchool(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try { await api.addSchool(schoolName); setSchoolName(""); await loadSchools(); }
    catch (e) { setError(message(e)); } finally { setBusy(false); }
  }
  if (!session) return <section className="live-panel"><h2>الدخول إلى البيانات الفعلية</h2><p>هذه المنطقة متصلة بالـ API المحلي، وليست بيانات المعاينة.</p><form className="live-form" onSubmit={login}><label>البريد الإلكتروني<input type="email" required value={email} onChange={e => setEmail(e.target.value)}/></label><label>كلمة المرور<input type="password" required value={password} onChange={e => setPassword(e.target.value)}/></label><label>معرف حساب المدرسة (Tenant ID)<input required value={tenant} onChange={e => setTenant(e.target.value)}/></label><button disabled={busy}>تسجيل الدخول</button></form>{error&&<p role="alert" className="live-error">{error}</p>}</section>;
  return <section className="live-panel"><div className="live-heading"><div><h2>البيانات الأكاديمية الفعلية</h2><p>{session.user.email} — {session.role}</p></div><button type="button" onClick={async()=>{await api.logout();setSession(null);setSchools([]);setRows([]);}}>تسجيل الخروج</button></div>
  {error&&<p role="alert" className="live-error">{error}</p>}
  <label>المدرسة<select value={schoolId} onChange={e=>setSchoolId(e.target.value)}>{schools.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
  {session.role==="owner"&&<form className="live-inline" onSubmit={addSchool}><input aria-label="اسم المدرسة الجديدة" required maxLength={200} value={schoolName} onChange={e=>setSchoolName(e.target.value)} placeholder="اسم مدرسة جديدة"/><button disabled={busy}>إضافة مدرسة</button></form>}
  <div className="live-tabs">{kinds.map(k=><button type="button" key={k.key} aria-pressed={kind===k.key} onClick={()=>{setKind(k.key);setForm({});setEditingId(null);setError("");}}>{k.title}</button>)}</div>
  <div className="table-wrap"><table><thead><tr>{selected.fields.map(f=><th key={f.name}>{f.label}</th>)}<th>المعرف</th><th>الإجراءات</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}>{selected.fields.map(f=><td key={f.name}>{r[f.name]||"—"}</td>)}<td><code>{r.id}</code></td><td><button type="button" onClick={()=>{setEditingId(r.id);setForm(Object.fromEntries(selected.fields.map(f=>[f.name,r[f.name]||""])));}}>تعديل</button></td></tr>)}</tbody></table>{!rows.length&&<p>لا توجد سجلات حالياً.</p>}</div>
  {["owner","principal","registrar"].includes(session.role)&&schoolId&&<form className="live-form" onSubmit={create}><h3>{editingId?"تعديل":"إضافة"} {selected.title}</h3>{selected.fields.map(f=><label key={f.name}>{f.label}{({grade_level_id:"grades",student_id:"students",academic_year_id:"years",section_id:"sections"} as Record<string,string>)[f.name] ? <select required value={form[f.name]||""} onChange={e=>setForm(v=>({...v,[f.name]:e.target.value}))}><option value="">اختر {f.label}</option>{(references[({grade_level_id:"grades",student_id:"students",academic_year_id:"years",section_id:"sections"} as Record<string,string>)[f.name]]||[]).map(r=><option key={r.id} value={r.id}>{r.name||r.full_name||r.id}</option>)}</select> : <input required maxLength={200} value={form[f.name]||""} onChange={e=>setForm(v=>({...v,[f.name]:e.target.value}))}/>}</label>)}<div className="live-inline"><button disabled={busy}>{editingId?"حفظ التعديل":"حفظ في قاعدة البيانات"}</button>{editingId&&<button type="button" onClick={()=>{setEditingId(null);setForm({});}}>إلغاء التعديل</button>}</div></form>}
  </section>;
}
