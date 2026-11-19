import {useEffect,useRef,useState} from "react";
import {api} from "../services/api";
type Notice={id:string;kind:string;title:string;body:string;target_path:string;created_at:string;read_at:string|null};
export default function NotificationInbox(){
 const [items,setItems]=useState<Notice[]>([]);
 const [unread,setUnread]=useState(0);
 const [error,setError]=useState("");
 const [voice,setVoice]=useState(()=>localStorage.getItem("schoolcloud_voice_enabled")==="yes");
 const initialized=useRef(false),seen=useRef<Set<string>>(new Set());
 useEffect(()=>{
  let alive=true;
  const refresh=async()=>{
   try{
    const result=await api.notifications();
    if(!alive)return;
    const fresh=result.items.filter(n=>!n.read_at&&!seen.current.has(n.id));
    if(initialized.current&&fresh.length&&voice&&document.visibilityState==="visible"&&"speechSynthesis" in window){
     // Speak only the newest notification while the app is foregrounded.
     const n=fresh[0];
     window.speechSynthesis.cancel();
     const speech=new SpeechSynthesisUtterance(n.body);
     speech.lang="ar-IQ";speech.rate=.92;
     const voices=window.speechSynthesis.getVoices();
     const arabic=voices.find(v=>v.lang.toLowerCase()==="ar-iq")||voices.find(v=>v.lang.toLowerCase().startsWith("ar"));
     if(arabic)speech.voice=arabic;
     window.speechSynthesis.speak(speech);
    }
    seen.current=new Set(result.items.map(n=>n.id));initialized.current=true;
    setItems(result.items);setUnread(result.unread);setError("");
   }catch(e){if(alive)setError(e instanceof Error?e.message:"تعذر جلب الإشعارات");}
  };
  void refresh();
  const timer=window.setInterval(()=>{if(document.visibilityState==="visible")void refresh();},20000);
  return()=>{alive=false;window.clearInterval(timer);if("speechSynthesis" in window)window.speechSynthesis.cancel();};
 },[voice]);
 async function mark(id:string){
  try{await api.notificationRead(id);setItems(old=>old.map(n=>n.id===id?{...n,read_at:new Date().toISOString()}:n));setUnread(x=>Math.max(0,x-1));}
  catch(e){setError(e instanceof Error?e.message:"تعذر تحديث الإشعار");}
 }
 return <section className="live-panel" dir="rtl">
  <div className="live-heading"><h2>مركز الإشعارات {unread>0&&<span aria-label="غير مقروء">({unread})</span>}</h2>
   <label style={{display:"flex",alignItems:"center",gap:8}}><input type="checkbox" checked={voice} onChange={e=>{setVoice(e.target.checked);localStorage.setItem("schoolcloud_voice_enabled",e.target.checked?"yes":"no");}}/> قراءة الإشعارات الجديدة بصوت عربي</label>
  </div>
  <p>تعمل القراءة الصوتية عند وصول إشعار جديد أثناء فتح الصفحة، بعد سماح المتصفح بتشغيل الصوت.</p>
  {error&&<p className="live-error" role="alert">{error}</p>}
  {!items.length?<p>لا توجد إشعارات حالياً.</p>:<div>{items.map(n=><article key={n.id} className="notice"><div className="notice-icon">◉</div><div style={{flex:1}}><strong>{n.title}</strong><p>{n.body}</p><small>{new Date(n.created_at).toLocaleString("ar-IQ")}</small>{!n.read_at&&<button type="button" className="text-button" onClick={()=>mark(n.id)}>تحديد كمقروء</button>}</div></article>)}</div>}
 </section>;
}
