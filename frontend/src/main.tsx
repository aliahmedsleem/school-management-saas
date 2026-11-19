import React,{useState} from "react";
import {createRoot} from "react-dom/client";
import RolePortal from "./components/RolePortal";
import InstallApp from "./components/InstallApp";
import "./style.css";
import "./components/academic.css";

type Role="owner"|"principal"|"registrar"|"teacher"|"student"|"parent"|null;
type Item={key:string;label:string;icon:string};
const menus:Record<Exclude<Role,null>,Item[]>={
 owner:[{key:"overview",label:"لوحة مدير النظام",icon:"◫"},{key:"schools",label:"المدارس",icon:"▣"},{key:"accounts",label:"توزيع حسابات المدارس",icon:"♧"},{key:"subscriptions",label:"الاشتراكات",icon:"▤"},{key:"learning",label:"المواد والجداول",icon:"▦"},{key:"attendance",label:"الحضور",icon:"◉"}],
 principal:[{key:"overview",label:"لوحة إدارة المدرسة",icon:"◫"},{key:"accounts",label:"الموظفون والحسابات",icon:"♧"},{key:"students",label:"الطلبة",icon:"♙"},{key:"teachers",label:"المدرسون",icon:"♧"},{key:"classes",label:"الصفوف والشعب",icon:"▦"},{key:"onboarding",label:"العام الدراسي",icon:"▣"},{key:"learning",label:"المواد والدرجات",icon:"▤"},{key:"attendance",label:"الحضور",icon:"◉"}],
 registrar:[{key:"overview",label:"لوحة المعاون",icon:"◫"},{key:"students",label:"تسجيل الطلبة",icon:"♙"},{key:"classes",label:"الصفوف والشعب",icon:"▦"},{key:"onboarding",label:"توزيع الطلبة",icon:"▣"},{key:"accounts",label:"حسابات الطلبة والأهالي",icon:"♧"},{key:"attendance",label:"الحضور",icon:"◉"},{key:"learning",label:"المواد الدراسية",icon:"▤"}],
 teacher:[{key:"overview",label:"لوحة المعلم",icon:"◫"},{key:"learning",label:"موادي وجدولي والدرجات",icon:"▦"},{key:"profile",label:"ملفي الوظيفي",icon:"♙"}],
 student:[{key:"overview",label:"بوابة الطالب وولي الأمر",icon:"◫"},{key:"learning",label:"الدرجات والجدول",icon:"▦"},{key:"attendance",label:"الحضور والغياب",icon:"◉"}],
 parent:[{key:"overview",label:"بوابة الطالب وولي الأمر",icon:"◫"},{key:"learning",label:"الدرجات والجدول",icon:"▦"},{key:"attendance",label:"الحضور والغياب",icon:"◉"}]
};
const titles:Record<Exclude<Role,null>,string>={owner:"إدارة النظام",principal:"إدارة المدرسة",registrar:"المعاون / شؤون الطلبة",teacher:"المعلم",student:"الطالب وولي الأمر",parent:"الطالب وولي الأمر"};
function App(){
 const [role,setRole]=useState<Role>(null);
 const [page,setPage]=useState("overview");
 const [menu,setMenu]=useState(false);
 const [showLogin,setShowLogin]=useState(false);
 const items=role?menus[role]:[];
 function handleRole(next:string){
  const normalized=(["owner","principal","registrar","teacher","student","parent"].includes(next)?next:null) as Role;
  setRole(current=>{if(current!==normalized)setPage("overview");return normalized});
  if(normalized)setShowLogin(true);
  setMenu(false);
 }
 return !role&&!showLogin?<div className="public-landing" dir="rtl">
  <header className="public-nav"><div className="public-brand"><span className="public-symbol">S</span><div><strong>SchoolCloud</strong><small>منصة الإدارة المدرسية</small></div></div><button className="public-login" onClick={()=>setShowLogin(true)}>تسجيل الدخول <span>←</span></button></header>
  <main className="public-hero"><div className="public-copy"><span className="public-eyebrow">منصة تعليمية لإدارة المدارس</span><h1>مدرستك،<br/><em>كلها في مكان واحد.</em></h1><p>من إدارة المدرسة وتسجيل الطلبة إلى الجداول والدرجات والحضور، تجربة رقمية موحدة تربط الإدارة والمعلمين والطلبة وأولياء الأمور.</p><div className="public-actions"><button onClick={()=>setShowLogin(true)}>الدخول إلى المنصة <span>←</span></button><a href="#features">استكشف المميزات</a></div><div className="public-trust"><span>◉ إدارة صلاحيات حسب الدور</span><span>◉ مدارس متعددة</span><span>◉ واجهة عربية متجاوبة</span></div></div><div className="public-visual" aria-label="معاينة توضيحية للمنصة"><div className="public-window"><div className="public-window-top"><span>SchoolCloud</span><span>● ● ●</span></div><div className="public-window-body"><div className="public-mini-title">لوحة المدرسة <small>معاينة توضيحية</small></div><div className="public-mini-grid"><div><span>شؤون الطلبة</span><strong>التسجيل</strong></div><div><span>الهيئة التدريسية</span><strong>المعلمون</strong></div><div><span>الشعب الدراسية</span><strong>الجداول</strong></div></div><div className="public-mini-list"><div><span>◉</span><b>إدارة السجلات الأكاديمية</b><small>منظمة ومترابطة</small></div><div><span>▦</span><b>متابعة الحضور والدرجات</b><small>حسب الصلاحيات</small></div><div><span>♧</span><b>الطالب وولي الأمر</b><small>بوابة واحدة</small></div></div></div></div><div className="public-float">✦ <span>واجهة موحدة للطالب وولي الأمر</span></div></div></main>
  <section className="public-features" id="features"><div className="public-section-title"><span>ماذا تقدم المنصة؟</span><h2>كل أطراف المدرسة، ضمن نظام واحد</h2></div><div className="public-feature-grid">{[{icon:"▣",title:"إدارة النظام",body:"تنظيم المدارس وحسابات إدارتها وصلاحيات الوصول."},{icon:"♙",title:"إدارة المدرسة والمعاون",body:"السجلات الدراسية وتسجيل الطلبة وتوزيعهم على الشعب."},{icon:"▦",title:"واجهة المعلم",body:"المواد والجداول وإدخال الدرجات وفق التكليف."},{icon:"♧",title:"الطالب وولي الأمر",body:"متابعة الحضور والدرجات والجدول عبر واجهة مشتركة."}].map(x=><article key={x.title}><span>{x.icon}</span><h3>{x.title}</h3><p>{x.body}</p></article>)}</div></section><footer className="public-footer"><strong>SchoolCloud</strong><span>نسخة اختبارية قيد التطوير — لا تستخدم بيانات حقيقية قبل اعتماد الحماية</span><button onClick={()=>setShowLogin(true)}>الدخول إلى المنصة</button></footer>
 </div>:<div className="shell" dir="rtl">
  <aside className={"sidebar "+(menu?"open":"")}>
   <div className="brand"><div className="brandmark">S</div><div><strong>SchoolCloud</strong><small>إدارة المدارس</small></div></div>
   <div className="nav-label">{role?titles[role]:"تسجيل الدخول"}</div>
   <nav aria-label="القائمة الرئيسية">{items.map(item=><button key={item.key} className={"nav-item "+(page===item.key?"selected":"")} onClick={()=>{setPage(item.key);setMenu(false)}}><span className="nav-icon">{item.icon}</span>{item.label}</button>)}</nav>
   {!role&&<p className="sidebar-hint">تظهر الصفحات المصرح بها فقط بعد تسجيل الدخول.</p>}
  </aside>
  <main className="content">
   <header className="topbar"><button className="menu-toggle" onClick={()=>setMenu(v=>!v)} aria-label="فتح القائمة">☰</button><div><strong>{role?titles[role]:"SchoolCloud"}</strong><small>واجهة مرتبطة بصلاحيات الحساب الفعلية</small></div><InstallApp/></header>
   {!role&&<button className="public-back" onClick={()=>setShowLogin(false)}>← العودة إلى الصفحة الرئيسية</button>}
   <RolePortal page={page} onRole={handleRole}/>
   <footer>SchoolCloud · نسخة اختبار · يمنع استخدام بيانات مدرسية حقيقية قبل اعتماد الحماية والاختبارات</footer>
  </main>
 </div>;
}
createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);
