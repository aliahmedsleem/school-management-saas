import React,{useEffect,useState} from "react";
import {createRoot} from "react-dom/client";
import SchoolInvitation from "./components/SchoolInvitation";
import WorkspaceFrame from "./components/WorkspaceFrame";
import { NotificationProvider } from "./components/NotificationProvider";
import { isRole, type Role } from "./access";
import { api } from "./services/api";
import "./style.css";
import "./components/academic.css";

function App(){
 const [role,setRole]=useState<Role|null>(null);
 const [page,setPage]=useState("overview");
 const [menu,setMenu]=useState(false);
 const [showLogin,setShowLogin]=useState(false);
 const invitationToken=new URLSearchParams(window.location.search).get("school_qr");
 useEffect(()=>{
  if(invitationToken)return;
  let active=true;
  void api.me().then(()=>{if(active)setShowLogin(true);}).catch(async()=>{
   try{await api.pending();if(active)setShowLogin(true);}catch{/* No authenticated session; keep the public landing page. */}
  });
  return()=>{active=false;};
 },[invitationToken]);
 function handleRole(next:string){
  const normalized=(isRole(next)?next:null) as Role|null;
  setRole(current=>{if(current!==normalized)setPage("overview");return normalized});
  if(normalized)setShowLogin(true);
  setMenu(false);
 }
 return invitationToken&&!role?<SchoolInvitation token={invitationToken} onLogin={()=>{window.history.replaceState(null,"",window.location.pathname);setShowLogin(true)}}/>:!role&&!showLogin?<div className="public-landing" dir="rtl">
  <header className="public-nav"><div className="public-brand"><span className="public-symbol">S</span><div><strong>SchoolCloud</strong><small>منصة الإدارة المدرسية</small></div></div><button className="public-login" onClick={()=>setShowLogin(true)}>تسجيل الدخول <span>←</span></button></header>
  <main className="public-hero"><div className="public-copy"><span className="public-eyebrow">منصة تعليمية لإدارة المدارس</span><h1>مدرستك،<br/><em>كلها في مكان واحد.</em></h1><p>إدارة مدرسية يومية أبسط، تربط الإدارة والمعلمين والطلبة وأولياء الأمور ضمن مساحة رقمية واحدة.</p><div className="public-actions"><button onClick={()=>setShowLogin(true)}>الدخول إلى المنصة <span>←</span></button><a href="#features">استكشف المميزات</a></div><div className="public-trust"><span>◉ صلاحيات حسب الدور</span><span>◉ مدارس متعددة</span><span>◉ واجهة عربية متجاوبة</span></div></div><div className="public-visual" aria-label="معاينة توضيحية للمنصة"><div className="public-window"><div className="public-window-top"><span>SchoolCloud</span><span>● ● ●</span></div><div className="public-window-body"><div className="public-mini-title">لوحة المدرسة <small>معاينة توضيحية</small></div><div className="public-mini-grid"><div><span>شؤون الطلبة</span><strong>التسجيل</strong></div><div><span>الهيئة التدريسية</span><strong>المعلمون</strong></div><div><span>الشعب الدراسية</span><strong>الجداول</strong></div></div><div className="public-mini-list"><div><span>◉</span><b>إدارة السجلات الأكاديمية</b><small>منظمة ومترابطة</small></div><div><span>▦</span><b>متابعة الحضور والدرجات</b><small>حسب الصلاحيات</small></div><div><span>♧</span><b>الطالب وولي الأمر</b><small>بوابة واحدة</small></div></div></div></div><div className="public-float">✦ <span>واجهة موحدة للمدرسة</span></div></div></main>
  <section className="public-features" id="features"><div className="public-section-title"><span>ماذا تقدم المنصة؟</span><h2>كل أطراف المدرسة، ضمن نظام واحد</h2></div><div className="public-feature-grid">{[{icon:"▣",title:"إدارة النظام",body:"تنظيم المدارس وحسابات إدارتها وصلاحيات الوصول."},{icon:"♙",title:"إدارة المدرسة",body:"السجلات الدراسية وتسجيل الطلبة وتوزيعهم."},{icon:"▦",title:"واجهة المعلم",body:"المواد والجداول والواجبات والدرجات."},{icon:"♧",title:"الطالب وولي الأمر",body:"متابعة الحضور والدرجات والجدول عبر واجهة مشتركة."}].map(x=><article key={x.title}><span>{x.icon}</span><h3>{x.title}</h3><p>{x.body}</p></article>)}</div></section><footer className="public-footer"><strong>SchoolCloud</strong><span>نسخة اختبارية قيد التطوير — لا تستخدم بيانات حقيقية قبل اعتماد الحماية</span><button onClick={()=>setShowLogin(true)}>الدخول إلى المنصة</button></footer>
 </div>:role?<NotificationProvider><WorkspaceFrame role={role} page={page} menu={menu} onPage={setPage} onMenu={setMenu} onRole={handleRole} showLogin={showLogin} onBack={()=>setShowLogin(false)}/></NotificationProvider>:<WorkspaceFrame role={null} page={page} menu={menu} onPage={setPage} onMenu={setMenu} onRole={handleRole} showLogin={showLogin} onBack={()=>setShowLogin(false)}/>;
}
createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);
