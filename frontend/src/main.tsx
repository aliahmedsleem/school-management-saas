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
 const items=role?menus[role]:[];
 function handleRole(next:string){
  const normalized=(["owner","principal","registrar","teacher","student","parent"].includes(next)?next:null) as Role;
  setRole(current=>{if(current!==normalized)setPage("overview");return normalized});
  setMenu(false);
 }
 return <div className="shell" dir="rtl">
  <aside className={"sidebar "+(menu?"open":"")}>
   <div className="brand"><div className="brandmark">S</div><div><strong>SchoolCloud</strong><small>إدارة المدارس</small></div></div>
   <div className="nav-label">{role?titles[role]:"تسجيل الدخول"}</div>
   <nav aria-label="القائمة الرئيسية">{items.map(item=><button key={item.key} className={"nav-item "+(page===item.key?"selected":"")} onClick={()=>{setPage(item.key);setMenu(false)}}><span className="nav-icon">{item.icon}</span>{item.label}</button>)}</nav>
   {!role&&<p className="sidebar-hint">تظهر الصفحات المصرح بها فقط بعد تسجيل الدخول.</p>}
  </aside>
  <main className="content">
   <header className="topbar"><button className="menu-toggle" onClick={()=>setMenu(v=>!v)} aria-label="فتح القائمة">☰</button><div><strong>{role?titles[role]:"SchoolCloud"}</strong><small>واجهة مرتبطة بصلاحيات الحساب الفعلية</small></div><InstallApp/></header>
   <RolePortal page={page} onRole={handleRole}/>
   <footer>SchoolCloud · نسخة اختبار · يمنع استخدام بيانات مدرسية حقيقية قبل اعتماد الحماية والاختبارات</footer>
  </main>
 </div>;
}
createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);
