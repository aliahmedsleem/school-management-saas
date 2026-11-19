import {useEffect,useState} from "react";
import {api} from "../services/api";
type Notice={id:string;kind:string;title:string;body:string;target_path:string;created_at:string;read_at:string|null};
const icons:Record<string,string>={homework:"▤",grade:"▦",attendance:"◉",support:"✉",announcement:"▣"};
export default function NotificationInbox(){
 const [items,setItems]=useState<Notice[]>([]);
 const [unread,setUnread]=useState(0);
 const [error,setError]=useState("");
 const [filter,setFilter]=useState<"all"|"unread">("all");
 const [voice,setVoice]=useState(()=>localStorage.getItem("schoolcloud_voice_enabled")==="yes");
 useEffect(()=>{
  let alive=true;
  const refresh=async()=>{try{const result=await api.notifications();if(!alive)return;setItems(result.items);setUnread(result.unread);setError("");}catch(e){if(alive)setError(e instanceof Error?e.message:"تعذر جلب الإشعارات");}};
  void refresh();const timer=window.setInterval(()=>{if(document.visibilityState==="visible")void refresh()},20000);
  return()=>{alive=false;window.clearInterval(timer)};
 },[]);
 async function mark(id:string){try{await api.notificationRead(id);setItems(old=>old.map(n=>n.id===id?{...n,read_at:new Date().toISOString()}:n));setUnread(x=>Math.max(0,x-1));}catch(e){setError(e instanceof Error?e.message:"تعذر تحديث الإشعار")}}
 const visible=filter==="unread"?items.filter(n=>!n.read_at):items;
 return <section className="notification-center" dir="rtl">
  <div className="notification-header"><div><span className="owner-eyebrow">التواصل والتنبيهات</span><h2>مركز الإشعارات</h2><p>تابع التنبيهات المتعلقة بحسابك في مكان واحد.</p></div><div className="notification-counter"><strong>{unread}</strong><span>غير مقروء</span></div></div>
  <div className="notification-toolbar"><div className="notification-filters"><button type="button" aria-pressed={filter==="all"} onClick={()=>setFilter("all")}>جميع الإشعارات <span>{items.length}</span></button><button type="button" aria-pressed={filter==="unread"} onClick={()=>setFilter("unread")}>غير المقروءة <span>{unread}</span></button></div><label className="notification-voice"><input type="checkbox" checked={voice} onChange={e=>{setVoice(e.target.checked);localStorage.setItem("schoolcloud_voice_enabled",e.target.checked?"yes":"no")}}/> تنبيه صوتي عربي</label></div>
  {error&&<p className="live-error" role="alert">{error}</p>}
  <div className="notification-list">{visible.length?visible.map(n=><article key={n.id} className={"notification-card "+(!n.read_at?"is-unread":"")}><div className="notification-kind">{icons[n.kind]||"◉"}</div><div className="notification-copy"><div className="notification-title"><strong>{n.title}</strong>{!n.read_at&&<span className="notification-new">جديد</span>}</div><p>{n.body}</p><time dateTime={n.created_at}>{new Date(n.created_at).toLocaleString("ar-IQ")}</time></div>{!n.read_at&&<button type="button" onClick={()=>mark(n.id)}>تحديد كمقروء</button>}</article>):<div className="notification-empty"><span>◉</span><strong>{filter==="unread"?"لا توجد إشعارات غير مقروءة":"لا توجد إشعارات حالياً"}</strong><p>ستظهر التنبيهات الجديدة هنا عند وصولها.</p></div>}</div>
  <p className="notification-note">القراءة الصوتية تعمل عند وصول إشعار جديد أثناء فتح التطبيق، وقد تتطلب السماح بالصوت من المتصفح.</p>
 </section>
}
