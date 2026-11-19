import {useEffect,useState} from "react";
type Props={role:string};
const EXAMPLE="عزيزي ولي الأمر، لدى التلميذ واجب جديد تم رفعه من الأستاذ. يرجى مراجعة تفاصيل الواجب وموعد تسليمه.";
export default function VoiceNotificationSettings({role}:Props){
 const [enabled,setEnabled]=useState(()=>localStorage.getItem("schoolcloud_voice_enabled")==="yes");
 const [supported,setSupported]=useState(false);
 const [speaking,setSpeaking]=useState(false);
 useEffect(()=>{setSupported(typeof window!=="undefined"&&"speechSynthesis" in window&&"SpeechSynthesisUtterance" in window);return()=>{if(typeof window!=="undefined"&&"speechSynthesis" in window)window.speechSynthesis.cancel();};},[]);
 function toggle(next:boolean){setEnabled(next);localStorage.setItem("schoolcloud_voice_enabled",next?"yes":"no");if(!next&&supported){window.speechSynthesis.cancel();setSpeaking(false);}}
 function preview(){
  if(!supported)return;
  window.speechSynthesis.cancel();
  const message=role==="parent"?EXAMPLE:"لديك إشعار جديد في منصة سكول كلاود. يرجى مراجعة مركز الإشعارات.";
  const utterance=new SpeechSynthesisUtterance(message);
  utterance.lang="ar-IQ";utterance.rate=0.92;utterance.volume=0.9;
  const voices=window.speechSynthesis.getVoices();
  const arabic=voices.find(v=>v.lang.toLowerCase()==="ar-iq")||voices.find(v=>v.lang.toLowerCase().startsWith("ar"));
  if(arabic)utterance.voice=arabic;
  utterance.onend=()=>setSpeaking(false);utterance.onerror=()=>setSpeaking(false);
  setSpeaking(true);window.speechSynthesis.speak(utterance);
 }
 return <section className="live-panel voice-settings" aria-label="إعدادات الإشعارات الصوتية">
  <h2>الإشعارات الصوتية</h2>
  <p>يمكنك تفعيل قراءة التنبيهات باللغة العربية على هذا الجهاز. القراءة الصوتية تعتمد على الأصوات المتاحة في المتصفح ونظام التشغيل.</p>
  <label className="voice-switch"><input type="checkbox" checked={enabled} disabled={!supported} onChange={e=>toggle(e.target.checked)}/> تفعيل قراءة الإشعارات بصوت عربي</label>
  <div className="live-inline"><button type="button" disabled={!supported} onClick={preview}>{speaking?"إعادة تشغيل المثال":"استمع إلى مثال"}</button>{speaking&&<button type="button" onClick={()=>{window.speechSynthesis.cancel();setSpeaking(false);}}>إيقاف الصوت</button>}</div>
  {!supported&&<p role="status">المتصفح الحالي لا يدعم تحويل النص إلى كلام.</p>}
  <p className="voice-note">هذه إعدادات الصوت والمعاينة فقط؛ تشغيل تنبيه عند وصول واجب جديد يتطلب ربطها بخدمة الإشعارات عند تنفيذها. لا يُشغّل الصوت تلقائياً دون موافقتك، وقد يمنع المتصفح التشغيل في الخلفية.</p>
 </section>;
}
