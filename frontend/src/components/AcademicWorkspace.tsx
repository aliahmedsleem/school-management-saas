import React, { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { api, type AcademicKind, type AcademicRow, type School, type SessionInfo } from "../services/api";
import "./academic.css";

const kinds: { key: AcademicKind; title: string; fields: { name: string; label: string }[] }[] = [
  { key: "years", title: "الأعوام الدراسية", fields: [{ name: "name", label: "اسم العام" }] },
  { key: "grades", title: "الصفوف", fields: [{ name: "name", label: "اسم الصف" }, { name: "stage", label: "المرحلة" }] },
  { key: "sections", title: "الشعب", fields: [{ name: "name", label: "اسم الشعبة" }, { name: "grade_level_id", label: "معرف الصف" }] },
  { key: "students", title: "الطلبة", fields: [{ name: "full_name", label: "اسم الطالب" }, { name: "student_code", label: "الرقم المدرسي" }, { name: "address", label: "عنوان السكن" }, { name: "guardian_name", label: "اسم ولي الأمر" }, { name: "guardian_phone", label: "رقم هاتف ولي الأمر" }, { name: "guardian_email", label: "البريد الإلكتروني لولي الأمر" }] },
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

export default function AcademicWorkspace({ page, authenticatedSession }: { page: string; authenticatedSession?: SessionInfo }) {
  const [session, setSession] = useState<SessionInfo | null>(authenticatedSession || null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolId, setSchoolId] = useState("");
  const [kind, setKind] = useState<AcademicKind>("students");
  const [rows, setRows] = useState<AcademicRow[]>([]);
  const [form, setForm] = useState<AcademicRow>({});
  const [schoolName, setSchoolName] = useState("");
  const [subscription, setSubscription] = useState<{ id: string; status: string; plan_id: string } | null>(null);
  const pageKinds: Record<string, AcademicKind> = { students:"students", teachers:"teachers", classes:"grades", onboarding:"years" };
  const activeKind = pageKinds[page];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [references, setReferences] = useState<Record<string, AcademicRow[]>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [viewingStudent, setViewingStudent] = useState<AcademicRow | null>(null);
  const [studentQuery, setStudentQuery] = useState("");
  const effectiveKind = ["students","classes","teachers","onboarding"].includes(page) ? kind : (activeKind || kind);
  const canWriteKind = session?.role !== "registrar" || ["students","enrollments"].includes(effectiveKind);
  const selected = kinds.find(k => k.key === effectiveKind)!;

  async function loadSchools() {
    const result = await api.schools();
    setSchools(result.items);
    setSchoolId(current => result.items.some(s => s.id === current) ? current : (result.items[0]?.id || ""));
  }
  useEffect(() => { if (authenticatedSession) setSession(authenticatedSession); else api.me().then(setSession).catch(() => {}); }, [authenticatedSession]);
  useEffect(() => { if (activeKind) { setKind(activeKind); setForm({}); setEditingId(null); } }, [activeKind]);
  useEffect(() => { if (session && (page === "subscriptions" || page === "overview")) api.subscription().then(r => setSubscription(r.subscription)).catch(e => setError(message(e))); }, [session, page]);
  useEffect(() => { if (session) loadSchools().catch(e => setError(message(e))); }, [session]);
  useEffect(() => {
    if (!session || !schoolId || (!activeKind && page !== "academics")) { setRows([]); return; }
    let cancelled = false;
    api.list(effectiveKind, schoolId).then(r => { if (!cancelled) setRows(r.items); }).catch(e => { if (!cancelled) setError(message(e)); });
    return () => { cancelled = true; };
  }, [session, schoolId, effectiveKind, page, activeKind]);
  async function login(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try { const result = await api.login(email, password); setSession(result); setPassword(""); }
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
    try { if (editingId) await api.update(effectiveKind, editingId, form); else await api.create(effectiveKind, { ...form, school_id: schoolId }); setEditingId(null); setForm({}); setRows((await api.list(effectiveKind, schoolId)).items); }
    catch (e) { setError(message(e)); } finally { setBusy(false); }
  }
  async function removeStudent(row: AcademicRow) {
    if (!row.id || !window.confirm(`حذف سجل الطالب «${row.full_name}»؟ لا يمكن حذف سجل مرتبط بالحضور أو الدرجات أو حساب ولي الأمر.`)) return;
    setBusy(true); setError("");
    try { await api.delete("students", row.id); setRows((await api.list("students", schoolId)).items); }
    catch (e) { setError(e instanceof Error && e.message === "record_in_use" ? "لا يمكن حذف الطالب لارتباط سجله بحضور أو درجات أو حسابات. احتفظ بالسجل وعدّل بياناته عند الحاجة." : message(e)); }
    finally { setBusy(false); }
  }
  async function addSchool(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try { await api.addSchool(schoolName); setSchoolName(""); await loadSchools(); }
    catch (e) { setError(message(e)); } finally { setBusy(false); }
  }
  if (!session) return <section className="live-panel"><h2>الدخول إلى البيانات الفعلية</h2><p>هذه المنطقة متصلة بالـ API المحلي، وليست بيانات المعاينة.</p><form className="live-form" onSubmit={login}><label>البريد الإلكتروني<input type="email" required value={email} onChange={e => setEmail(e.target.value)}/></label><label>كلمة المرور<input type="password" required value={password} onChange={e => setPassword(e.target.value)}/></label><button disabled={busy}>تسجيل الدخول</button></form>{error&&<p role="alert" className="live-error">{error}</p>}</section>;
  return <section className="live-panel"><div className="live-heading"><div><h2>{session.role==="owner"?"إدارة المؤسسة والمدارس":"إدارة البيانات الأكاديمية"}</h2><p>{session.user.email} — {session.role}</p></div>{!authenticatedSession && <button type="button" onClick={async()=>{await api.logout();setSession(null);setSchools([]);setRows([]);}}>تسجيل الخروج</button>}</div>
  {error&&<p role="alert" className="live-error">{error}</p>}
  {session.role!=="owner"&&<label>المدرسة<select value={schoolId} onChange={e=>setSchoolId(e.target.value)}>{schools.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>}
  {session.role==="owner"&&page==="schools"&&<form className="live-inline" onSubmit={addSchool}><input aria-label="اسم المدرسة الجديدة" required maxLength={200} value={schoolName} onChange={e=>setSchoolName(e.target.value)} placeholder="اسم مدرسة جديدة"/><button disabled={busy}>إضافة مدرسة</button></form>}
  {page === "subscriptions" ? <div className="live-panel"><h3>الاشتراك الحالي</h3>{subscription ? <p>الحالة: {subscription.status} — الخطة: {subscription.plan_id}</p> : <p>لا يوجد اشتراك مسجل.</p>}</div> : page === "schools" ? <div className="table-wrap"><table><thead><tr><th>المدرسة</th><th>الدولة</th><th>المنطقة الزمنية</th></tr></thead><tbody>{schools.map(s=><tr key={s.id}><td>{s.name}</td><td>{s.country_code}</td><td>{s.timezone}</td></tr>)}</tbody></table></div> : page === "overview" ? <div className="live-panel"><h3>{session.role==="owner"?"ملخص المؤسسة":"ملخص المدرسة"}</h3><p>المدارس المتاحة: {schools.length}</p><p>الاشتراك: {subscription?.status || "غير محدد"}</p></div> : !activeKind && page !== "academics" ? <p role="status">هذه الوحدة غير مرتبطة بالـ API بعد. لن تُعرض بيانات تجريبية في الوضع الفعلي.</p> : <><div className="live-tabs">{(page === "students" ? kinds.filter(k=>["students","enrollments"].includes(k.key)) : page === "classes" ? kinds.filter(k=>["grades","sections","years"].includes(k.key)) : page === "teachers" ? kinds.filter(k=>k.key==="teachers") : page === "onboarding" ? kinds.filter(k=>["years","grades","sections"].includes(k.key)) : kinds).map(k=><button type="button" key={k.key} aria-pressed={effectiveKind===k.key} onClick={()=>{setKind(k.key);setForm({});setEditingId(null);setError("");}}>{k.title}</button>)}</div>
  {effectiveKind==="students"?<><div className="student-list-tools"><label>بحث عن طالب<input type="search" value={studentQuery} onChange={e=>setStudentQuery(e.target.value)} placeholder="الاسم أو الرقم المدرسي أو هاتف ولي الأمر"/></label><span>{rows.length} طالب</span></div><div className="student-cards">{rows.filter(r=>[r.full_name,r.student_code,r.guardian_name,r.guardian_phone].some(v=>(v||"").toLowerCase().includes(studentQuery.trim().toLowerCase()))).map(r=><article className="student-record" key={r.id}><div className="student-record-head"><span className="student-avatar">{(r.full_name||"ط").slice(0,1)}</span><div><strong>{r.full_name}</strong><small>الرقم المدرسي: {r.student_code}</small></div></div><div className="student-record-meta"><span>ولي الأمر</span><strong>{r.guardian_name||"غير مسجل"}</strong><span>الهاتف</span><strong dir="ltr">{r.guardian_phone||"غير مسجل"}</strong></div><div className="student-record-actions"><button type="button" onClick={()=>setViewingStudent(r)}>عرض الملف</button>{canWriteKind&&<><button type="button" onClick={()=>{setEditingId(r.id);setForm(Object.fromEntries(selected.fields.map(f=>[f.name,r[f.name]||""])));}}>تعديل</button><button className="student-delete" type="button" disabled={busy} onClick={()=>void removeStudent(r)}>حذف</button></>}</div></article>)}</div>{!rows.length&&<p>لا توجد سجلات حالياً.</p>}</>:<div className="table-wrap"><table><thead><tr>{selected.fields.map(f=><th key={f.name}>{f.label}</th>)}<th>المعرف</th><th>الإجراءات</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}>{selected.fields.map(f=><td key={f.name}>{r[f.name]||"—"}</td>)}<td><code>{r.id}</code></td><td>{canWriteKind&&<button type="button" onClick={()=>{setEditingId(r.id);setForm(Object.fromEntries(selected.fields.map(f=>[f.name,r[f.name]||""])));}}>تعديل</button>}</td></tr>)}</tbody></table>{!rows.length&&<p>لا توجد سجلات حالياً.</p>}</div>}
  {["owner","principal","registrar"].includes(session.role)&&canWriteKind&&schoolId&&<form className="live-form student-form" onSubmit={create}><h3>{editingId?"تعديل ملف طالب":"إضافة طالب جديد"}</h3><p className="student-form-note">أدخل معلومات الطالب وولي الأمر. ينشئ النظام رقماً فريداً للـ QR تلقائياً عند حفظ السجل.</p><div className="student-form-grid">{selected.fields.map(f=><label key={f.name}>{f.label}{({grade_level_id:"grades",student_id:"students",academic_year_id:"years",section_id:"sections"} as Record<string,string>)[f.name] ? <select required value={form[f.name]||""} onChange={e=>setForm(v=>({...v,[f.name]:e.target.value}))}><option value="">اختر {f.label}</option>{(references[({grade_level_id:"grades",student_id:"students",academic_year_id:"years",section_id:"sections"} as Record<string,string>)[f.name]]||[]).map(r=><option key={r.id} value={r.id}>{r.name||r.full_name||r.id}</option>)}</select> : <input required={!["address","guardian_name","guardian_phone","guardian_email"].includes(f.name)} type={f.name==="guardian_email"?"email":"text"} maxLength={f.name==="address"?300:320} value={form[f.name]||""} onChange={e=>setForm(v=>({...v,[f.name]:e.target.value}))}/>}</label>)}</div><div className="live-inline"><button disabled={busy}>{editingId?"حفظ التعديل":"حفظ الطالب"}</button>{editingId&&<button type="button" onClick={()=>{setEditingId(null);setForm({});}}>إلغاء التعديل</button>}</div></form>}
  {viewingStudent&&<div className="student-modal-backdrop" role="presentation" onClick={()=>setViewingStudent(null)}><section className="student-modal" role="dialog" aria-modal="true" aria-labelledby="student-card-title" onClick={e=>e.stopPropagation()}><div className="student-modal-heading"><div><span>ملف الطالب</span><h3 id="student-card-title">{viewingStudent.full_name}</h3></div><button type="button" aria-label="إغلاق" onClick={()=>setViewingStudent(null)}>×</button></div><div className="student-profile-grid"><div><span>الرقم المدرسي</span><strong>{viewingStudent.student_code||"—"}</strong></div><div><span>العنوان</span><strong>{viewingStudent.address||"غير مسجل"}</strong></div><div><span>ولي الأمر</span><strong>{viewingStudent.guardian_name||"غير مسجل"}</strong></div><div><span>هاتف ولي الأمر</span><strong dir="ltr">{viewingStudent.guardian_phone||"غير مسجل"}</strong></div><div><span>البريد الإلكتروني</span><strong>{viewingStudent.guardian_email||"غير مسجل"}</strong></div></div><div className="student-qr-block"><QRCodeSVG value={viewingStudent.qr_token||viewingStudent.id||""} size={168} level="Q" includeMargin/><div><strong>رمز الطالب الفريد</strong><p>رمز تعريفي فقط؛ لا يمنح صلاحية دخول إلى حساب الطالب أو ولي الأمر.</p><code>{viewingStudent.qr_token||"—"}</code></div></div><div className="student-modal-actions"><button type="button" onClick={()=>window.print()}>طباعة بطاقة الطالب</button><button type="button" onClick={()=>setViewingStudent(null)}>إغلاق</button></div></section></div>}
  </>}
  </section>;
}
