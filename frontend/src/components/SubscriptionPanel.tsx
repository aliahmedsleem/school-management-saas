import {useEffect,useState} from "react";
import {api} from "../services/api";
type Plan={id:string;code:string;name:string;price_minor:number;currency:string};
type Current={id:string;status:string;plan_id:string}|null;
export default function SubscriptionPanel(){
 const [plans,setPlans]=useState<Plan[]>([]);
 const [current,setCurrent]=useState<Current>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 useEffect(()=>{let alive=true;Promise.all([api.subscriptionPlans(),api.subscription()]).then(([catalog,subscription])=>{if(alive){setPlans(catalog.items);setCurrent(subscription.subscription)}}).catch(()=>{if(alive)setError("تعذر تحميل بيانات الاشتراكات")}).finally(()=>{if(alive)setLoading(false)});return()=>{alive=false}},[]);
 const selected=plans.find(p=>p.id===current?.plan_id);
 return <section className="owner-dashboard" dir="rtl">
  <div className="owner-intro"><div><span className="owner-eyebrow">الاشتراكات والفوترة</span><h1>الاشتراك والخطط المتاحة</h1><p>راجع خطة المؤسسة الحالية وقارن الخطط المسجلة في المنصة.</p></div></div>
  {error&&<p role="alert" className="live-error">{error}</p>}
  <div className="live-panel"><h2>الاشتراك الحالي</h2>{loading?<p>جاري تحميل البيانات...</p>:current?<div className="owner-stats"><article><span>الخطة</span><strong className="owner-stat-text">{selected?.name||"خطة غير مدرجة"}</strong></article><article><span>حالة الاشتراك</span><strong className="owner-stat-text">{current.status}</strong></article><article><span>رمز الخطة</span><strong className="owner-stat-text">{selected?.code||"—"}</strong></article></div>:<p className="owner-muted">لا يوجد اشتراك مسجل لهذه المؤسسة.</p>}</div>
  <div className="live-panel"><h2>الخطط المتاحة</h2><p className="owner-muted">الأسعار المعروضة هي الأسعار المسجلة في النظام، ولا تعني تفعيل اشتراك أو خصم أي مبلغ.</p><div className="owner-stats">{plans.map(p=><article key={p.id}><span>{p.code}</span><strong className="owner-stat-text">{p.name}</strong><strong>{new Intl.NumberFormat("ar-IQ").format(p.price_minor/100)} <small>{p.currency}</small></strong>{current?.plan_id===p.id&&<small>الخطة الحالية</small>}</article>)}</div>{!loading&&!plans.length&&<p className="owner-muted">لم تُضف خطط اشتراك إلى النظام بعد.</p>}</div>
 </section>
}
