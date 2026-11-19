import React, { useEffect, useState } from "react";
import AcademicWorkspace from "./AcademicWorkspace";
import AttendancePanel from "./AttendancePanel";
import LearningPanel from "./LearningPanel";
import FamilyPortal from "./FamilyPortal";
import VoiceNotificationSettings from "./VoiceNotificationSettings";
import HomeworkPanel from "./HomeworkPanel";
import NotificationInbox from "./NotificationInbox";
import NotificationVoiceListener from "./NotificationVoiceListener";
import OwnerDashboard from "./OwnerDashboard";
import { api, type SessionInfo, type MembershipInfo } from "../services/api";
import "./academic.css";

const names: Record<string,string> = {owner:"مدير النظام",principal:"إدارة المدرسة",registrar:"المعاون / شؤون الطلبة",teacher:"المدرس",student:"الطالب",parent:"ولي الأمر"};
const allowed: Record<string,string[]> = {
 owner:["overview","schools","subscriptions","accounts"],
 principal:["overview","accounts","students","teachers","classes","onboarding","attendance","learning"],
 registrar:["overview","accounts","students","classes","onboarding","attendance","learning"],
 teacher:["overview","profile","learning","homework"], student:["overview","attendance","learning","homework"],parent:["overview","attendance","learning","homework"]
};
export default function RolePortal({page, onRole, onNavigate}: {page:string;onRole?:(role:string)=>void;onNavigate?:(page:string)=>void}) {
 const [session,setSession]=useState<SessionInfo|null>(null);
 const [loading,setLoading]=useState(true);
 const [email,setEmail]=useState("");
 const [password,setPassword]=useState("");
 const [tenant,setTenant]=useState("");
 const [error,setError]=useState("");
 const [members,setMembers]=useState<MembershipInfo[]>([]);
 const [profile,setProfile]=useState<{name:string;code:string}|null>(null);
 const [children,setChildren]=useState<{id:string;full_name:string;student_code:string}[]>([]);
 const [accounts,setAccounts]=useState<{id:string;email:string;role:string;school_id:string|null}[]>([]);
 const [schools,setSchools]=useState<{id:string;name:string}[]>([]);
 const [form,setForm]=useState({email:"",password:"",role:"principal",school_id:"",record_id:""});
 const [studentOptions,setStudentOptions]=useState<{id:string;full_name:string;student_code:string}[]>([]);
 const [teacherOptions,setTeacherOptions]=useState<{id:string;full_name:string;employee_code:string}[]>([]);
 const [guardianMembership,setGuardianMembership]=useState("");
 const [linkedStudent,setLinkedStudent]=useState("");
 const [feedback,setFeedback]=useState("");
 const [guardianSchool,setGuardianSchool]=useState("");
 const [guardianStudents,setGuardianStudents]=useState<{id:string;full_name:string;student_code:string}[]>([]);
 const [busy,setBusy]=useState(false);
 const [needsSelection,setNeedsSelection]=useState(false);
 useEffect(()=>{api.me().then(async s=>{setSession(s);onRole?.(s.role);try {const c=await api.portalContext();setMembers(c.memberships);setSchools(c.schools);}catch{setNeedsSelection(true);}}).catch(async()=>{try{const pending=await api.pending();if(pending.selection_required){setMembers(pending.memberships);setSession({...pending,role:""});setNeedsSelection(true);}}catch{/* unauthenticated */}}).finally(()=>setLoading(false));},[]);
 useEffect(()=>{
  if(!session)return;
  if(session.role==="parent")api.myStudents().then(r=>setChildren(r.items)).catch(()=>{});
  if(["teacher","student"].includes(session.role))api.myProfile().then(setProfile).catch(()=>{});
  if(page==="accounts"&&["owner","principal","registrar"].includes(session.role))api.accounts().then(r=>setAccounts(r.items)).catch(()=>{});
 },[session,page]);
 useEffect(()=>{
  if(!session || !form.school_id || !["owner","principal","registrar"].includes(session.role)) {setStudentOptions([]);setTeacherOptions([]);return;}
  api.schoolStudents(form.school_id).then(r=>setStudentOptions(r.items)).catch(()=>setStudentOptions([]));
  api.schoolTeachers(form.school_id).then(r=>setTeacherOptions(r.items)).catch(()=>setTeacherOptions([]));
 },[session,form.school_id]);
 useEffect(()=>{if(!session||!guardianSchool){setGuardianStudents([]);return;}api.schoolStudents(guardianSchool).then(r=>setGuardianStudents(r.items)).catch(()=>setGuardianStudents([]));},[session,guardianSchool]);
 async function login(e:React.FormEvent) {
  e.preventDefault();setBusy(true);setError("");
  try{
   const s=await api.login(email,password,tenant);
   setMembers(s.memberships||[]);
   if((s.memberships||[]).length>1) {setNeedsSelection(true);setSession(s);setPassword("");onRole?.("");return;}
   const c=await api.portalContext();
   setSchools(c.schools);setNeedsSelection(false);setSession(s);onRole?.(s.role);setPassword("");
  }catch(e){setError(e instanceof Error?e.message:"فشل تسجيل الدخول");}finally{setBusy(false);}
 }
 async function select(m:MembershipInfo) {
  setBusy(true);setError("");
  try {await api.selectMembership(m.id);const s=await api.me();setSession(s);onRole?.(s.role);const c=await api.portalContext();setSchools(c.schools);setMembers(c.memberships);setNeedsSelection(false);}
  catch(e){setError(e instanceof Error?e.message:"تعذر اختيار المدرسة");}finally{setBusy(false);}
 }
 async function addAccount(e:React.FormEvent) {
  e.preventDefault();setBusy(true);setError("");
  try {await api.createAccount(form);setAccounts((await api.accounts()).items);setForm({...form,email:"",password:"",record_id:""});setFeedback("تم إنشاء الحساب وربطه بالمدرسة.");setGuardianSchool(form.school_id);}
  catch(e){setError(e instanceof Error?e.message:"تعذر إنشاء الحساب");}finally{setBusy(false);}
 }
 if(loading)return <section className="live-panel">جاري التحقق من الجلسة...</section>;
 if(!session)return <section className="live-panel role-login">
  <div className="role-login-head"><span className="role-login-logo">S</span><div><h2>مرحباً بك في SchoolCloud</h2><p>بوابة الدخول الموحدة لإدارة المنصة والمدارس والمدرسين والطلبة وأولياء الأمور</p></div></div>
  <div className="role-chips"><span>مدير النظام</span><span>إدارة المدرسة</span><span>المعاون</span><span>المعلم</span><span>الطالب وولي الأمر</span></div>
  <form className="live-form" onSubmit={login}>
   <label>البريد الإلكتروني<input autoComplete="username" type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
   <label>كلمة المرور<input autoComplete="current-password" type="password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>
   <label>معرف المؤسسة (Tenant ID)<input required value={tenant} onChange={e=>setTenant(e.target.value)}/></label>
   <button disabled={busy}>{busy?"جاري الدخول...":"تسجيل الدخول"}</button>
  </form>{error&&<p className="live-error" role="alert">{error}</p>}
  <p>يحدد النظام صلاحياتك تلقائياً بعد تسجيل الدخول. لا يمكن اختيار دور أعلى من الصلاحية الممنوحة لحسابك.</p>
 </section>;
 if(needsSelection && members.length>1) return <section className="live-panel"><h2>اختر الحساب والمدرسة</h2>{members.map(m=><button style={{margin:6}} disabled={busy} key={m.id} onClick={()=>select(m)}>{names[m.role]||m.role} — {m.school_id||"جميع المدارس"}</button>)}{error&&<p role="alert">{error}</p>}</section>;
 const role=session.role;
 const permitted=page==="notifications"||(allowed[role]||["overview"]).includes(page);
 return <div className="role-portal">
  <NotificationVoiceListener/>
  <div className="role-session" aria-label="الحساب الحالي"><span>{names[role]||role}</span><strong>{session.user.email}</strong><button onClick={async()=>{try{await api.logout();}finally{setSession(null);setMembers([]);setSchools([]);setProfile(null);setChildren([]);setNeedsSelection(false);onRole?.("");}}}>تسجيل الخروج</button></div>
  {error&&<p className="live-error" role="alert">{error}</p>}

  {!permitted?<section className="live-panel"><h2>غير مصرح</h2><p>هذه الصفحة غير متاحة لدورك الحالي. اختر صفحة مسموحة من القائمة.</p></section>:
  role==="owner"&&page==="overview"?<OwnerDashboard onNavigate={onNavigate}/>:
  page==="notifications"?<NotificationInbox/>:
  page==="homework"?<HomeworkPanel role={role}/>:
  ["student","parent"].includes(role)?<FamilyPortal role={role as "student"|"parent"} page={page}/>:
  page==="learning"?<LearningPanel role={role} schools={schools}/>:
  page==="attendance"?<AttendancePanel role={role} schools={schools} children={children}/>:
  role==="parent"?<section className="live-panel"><h2>أبنائي</h2><p>الطلبة المرتبطون بحساب ولي الأمر فقط</p>{children.length?<div className="table-wrap"><table><thead><tr><th>الطالب</th><th>الرقم المدرسي</th></tr></thead><tbody>{children.map(c=><tr key={c.id}><td>{c.full_name}</td><td>{c.student_code}</td></tr>)}</tbody></table></div>:<p>لا يوجد أبناء مرتبطون بحسابك بعد.</p>}</section>:
  ["student","teacher"].includes(role)?<section className="live-panel"><h2>{role==="student"?"بوابة الطالب":"بوابة المدرس"}</h2>{profile?<><h3>{profile.name}</h3><p>الرقم: {profile.code}</p></>:<p>لم يتم ربط الحساب بسجل {role==="student"?"الطالب":"المدرس"} بعد.</p>}<p>الجداول والواجبات والدرجات ستظهر هنا بعد تفعيل وحداتها الخلفية.</p></section>:
  page==="accounts"&&["owner","principal","registrar"].includes(role)?<section className="live-panel"><h2>{role==="owner"?"توزيع حسابات مديري المدارس":"حسابات المستخدمين والصلاحيات"}</h2><p>{role==="owner"?"إنشاء حساب مدير لكل مدرسة فقط. بقية الحسابات ينشئها مدير المدرسة أو المعاون حسب الصلاحيات.":"إدارة حسابات المدرسة ضمن الصلاحيات الممنوحة."}</p><div className="table-wrap"><table><thead><tr><th>البريد</th><th>الدور</th><th>المدرسة</th></tr></thead><tbody>{accounts.map(a=><tr key={a.id}><td>{a.email}</td><td>{names[a.role]||a.role}</td><td>{schools.find(s=>s.id===a.school_id)?.name||a.school_id||"المؤسسة"}</td></tr>)}</tbody></table></div><form className="live-form" onSubmit={addAccount}><h3>إنشاء حساب</h3><label>البريد الإلكتروني<input type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>كلمة مرور مؤقتة (12 حرفاً على الأقل)<input type="password" minLength={12} required value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label><label>الدور<select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>{(role==="owner"?["principal"]:role==="principal"?["registrar","teacher","student","parent"]:["student","parent"]).map(r=><option key={r} value={r}>{names[r]}</option>)}</select></label><label>المدرسة<select required value={form.school_id} onChange={e=>setForm({...form,school_id:e.target.value})}><option value="">اختر مدرسة</option>{schools.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>{["teacher","student","parent"].includes(form.role)&&<label>{form.role==="teacher"?"المدرس المرتبط":"الطالب المرتبط"} {form.role!=="parent"?"(مطلوب)":"(اختياري)"}<select required={form.role!=="parent"} value={form.record_id} onChange={e=>setForm({...form,record_id:e.target.value})}><option value="">اختر من سجلات المدرسة</option>{(form.role==="teacher"?teacherOptions:studentOptions).map(item=><option key={item.id} value={item.id}>{item.full_name} — {"student_code" in item?item.student_code:item.employee_code}</option>)}</select></label>}<button disabled={busy}>إنشاء الحساب</button></form>{role!=="owner"&&<form className="live-form" onSubmit={async e=>{e.preventDefault();setBusy(true);setError("");try{await api.linkGuardian(guardianMembership,linkedStudent);setFeedback("تم ربط الطالب بولي الأمر بنجاح.");setLinkedStudent("");}catch(e){setError(e instanceof Error?e.message:"تعذر الربط");}finally{setBusy(false);}}}><h3>ربط ابن إضافي بولي الأمر</h3><label>المدرسة<select required value={guardianSchool} onChange={e=>{setGuardianSchool(e.target.value);setGuardianMembership("");setLinkedStudent("");}}><option value="">اختر مدرسة</option>{schools.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>حساب ولي الأمر<select required value={guardianMembership} onChange={e=>setGuardianMembership(e.target.value)}><option value="">اختر ولي الأمر</option>{accounts.filter(a=>a.role==="parent"&&a.school_id===guardianSchool).map(a=><option key={a.id} value={a.id}>{a.email}</option>)}</select></label><label>الطالب<select required value={linkedStudent} onChange={e=>setLinkedStudent(e.target.value)}><option value="">اختر الطالب</option>{guardianStudents.map(s=><option key={s.id} value={s.id}>{s.full_name} — {s.student_code}</option>)}</select></label><button disabled={busy}>ربط الطالب</button></form>}{feedback&&<p role="status">{feedback}</p>}</section>:
  <AcademicWorkspace page={page} authenticatedSession={session}/>}
 </div>;
}
