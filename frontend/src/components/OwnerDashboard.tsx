import {useEffect,useState} from "react";
import {api} from "../services/api";

type Overview={tenant:{id:string;name:string;status:string}|null;schools_count:number;accounts_count:number;subscription_status:string|null;schools:{id:string;name:string}[]};
export default function OwnerDashboard({onNavigate}:{onNavigate?:(page:string)=>void}){
 const [data,setData]=useState<Overview|null>(null);
 const [error,setError]=useState("");
 useEffect(()=>{let alive=true;api.ownerOverview().then(r=>{if(alive)setData(r)}).catch(()=>{if(alive)setError("تعذر تحميل إحصاءات المؤسسة. حاول تحديث الصفحة.")});return()=>{alive=false}},[]);
 return <div className="owner-dashboard">
  <div className="owner-intro"><div><span className="owner-eyebrow">إدارة المؤسسة</span><h1>مرحباً بك في لوحة الإدارة</h1><p>إدارة المدارس والحسابات والاشتراكات من مكان واحد، بعيداً عن العمليات الأكاديمية اليومية.</p></div><span className="owner-status">{data?.tenant?.name||"SchoolCloud"}</span></div>
  {error&&<p className="live-error" role="alert">{error}</p>}
  <div className="owner-stats">
   <article><span>المدارس المسجلة</span><strong>{data?.schools_count??"—"}</strong><small>ضمن هذه المؤسسة</small></article>
   <article><span>المستخدمون</span><strong>{data?.accounts_count??"—"}</strong><small>حسابات المؤسسة الفريدة</small></article>
   <article><span>حالة الاشتراك</span><strong className="owner-stat-text">{data?.subscription_status||"غير محدد"}</strong><small>الاشتراك الحالي</small></article>
  </div>
  <div className="owner-columns">
   <section className="live-panel"><h2>المدارس التابعة للمؤسسة</h2><p className="owner-muted">عرض مختصر لأسماء المدارس المسجلة</p>{data?.schools.length?<div className="owner-school-list">{data.schools.map(s=><div key={s.id}><span className="owner-school-icon">▣</span><strong>{s.name}</strong></div>)}</div>:<p className="owner-muted">{data?"لا توجد مدارس مسجلة بعد.":"جاري التحميل..."}</p>}<button className="owner-link" onClick={()=>onNavigate?.("schools")}>إدارة المدارس ←</button></section>
   <section className="live-panel"><h2>إجراءات الإدارة</h2><p className="owner-muted">إدارة الهيكل الإداري والاشتراكات فقط</p><div className="owner-actions"><button onClick={()=>onNavigate?.("schools")}>▣ المدارس</button><button onClick={()=>onNavigate?.("accounts")}>♧ الحسابات والصلاحيات</button><button onClick={()=>onNavigate?.("subscriptions")}>▤ الاشتراكات</button><button onClick={()=>onNavigate?.("notifications")}>◉ الإشعارات</button></div></section>
  </div>
 </div>
}
