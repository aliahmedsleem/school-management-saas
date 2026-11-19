import {useEffect,useState} from "react";
import {api} from "../services/api";

type School={school_id:string;school_name:string;tenant_id:string;verification_required:boolean};
export default function SchoolInvitation({token,onLogin}:{token:string;onLogin:()=>void}){
 const [school,setSchool]=useState<School|null>(null);
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;api.resolveSchoolQr(token).then(s=>{if(active)setSchool(s)}).catch(()=>{if(active)setError("الرابط غير صالح أو انتهت صلاحيته. اطلب رمزاً جديداً من إدارة المدرسة.")}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[token]);
 return <div className="school-invitation" dir="rtl"><section className="school-invitation-card">
  <span className="school-invitation-brand">SchoolCloud</span>
  <h1>الانضمام إلى المدرسة</h1>
  {loading?<p>جاري التحقق من رمز المدرسة...</p>:error?<p role="alert" className="live-error">{error}</p>:school&&<>
   <div className="school-invitation-school"><span>المدرسة</span><strong>{school.school_name}</strong></div>
   <p>تم التأكد من هوية المدرسة. لا يتيح هذا الرمز الوصول إلى سجل طالب أو ولي أمر دون تحقق إضافي من إدارة المدرسة.</p>
   <p>الربط التلقائي عبر Google والاسم الرباعي قيد التطوير، ولن يُفعّل قبل إضافة تحقق مستقل يمنع انتحال الهوية.</p>
   <button onClick={onLogin}>الانتقال إلى تسجيل الدخول</button>
  </>}
  <a href="/" className="school-invitation-back">العودة إلى الصفحة الرئيسية</a>
 </section></div>
}
