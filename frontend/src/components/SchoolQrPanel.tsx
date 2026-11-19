import {useState} from "react";
import {api} from "../services/api";

export default function SchoolQrPanel(){
 const [link,setLink]=useState("");
 const [school,setSchool]=useState("");
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 async function generate(){
  setBusy(true);setError("");
  try{
   const result=await api.schoolQr();
   setSchool(result.school_name);
   const url=new URL(window.location.origin+"/");
   url.searchParams.set("school_qr",result.token);
   setLink(url.toString());
  }catch(e){setError(e instanceof Error?e.message:"تعذر إنشاء رابط المدرسة")}
  finally{setBusy(false)}
 }
 return <section className="live-panel" dir="rtl">
  <h3>رمز ربط المدرسة</h3>
  <p>إنشاء رابط موقّع صالح لمدة 24 ساعة للتعريف بالمدرسة. هذا الرابط لا يمنح أي شخص صلاحية طالب أو ولي أمر؛ يتطلب الربط تحققاً إضافياً من السجل المدرسي.</p>
  <button type="button" disabled={busy} onClick={generate}>{busy?"جاري الإنشاء...":"إنشاء رابط المدرسة"}</button>
  {error&&<p role="alert" className="live-error">{error}</p>}
  {link&&<div className="live-form"><strong>{school}</strong><label>رابط المدرسة<input readOnly dir="ltr" value={link} onFocus={e=>e.currentTarget.select()}/></label><button type="button" onClick={()=>{void navigator.clipboard.writeText(link).catch(()=>setError("انسخ الرابط يدوياً من الحقل"))}}>نسخ الرابط</button><small>لا تشارك بيانات الطلاب أو رموز التحقق الشخصية مع هذا الرابط.</small></div>}
 </section>
}
