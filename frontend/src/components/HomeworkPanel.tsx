import {useEffect,useState} from "react";
import {api} from "../services/api";
type Item={id:string;assignment_id:string;school_id:string;title:string;description:string;due_at:string;created_at:string};
export default function HomeworkPanel({role}:{role:string}){
 const [items,setItems]=useState<Item[]>([]),[assignments,setAssignments]=useState<{id:string;school_id:string;subject?:string;section?:string}[]>([]);
 const [assignmentId,setAssignmentId]=useState(""),[title,setTitle]=useState(""),[description,setDescription]=useState(""),[due,setDue]=useState("");
 const [message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 async function reload(){try{setItems((await api.homeworkList()).items);}catch(e){setMessage(e instanceof Error?e.message:"تعذر تحميل الواجبات");}}
 useEffect(()=>{void reload();if(role==="teacher")api.learningMine().then(x=>setAssignments(x.assignments||[])).catch(()=>{});},[role]);
 async function create(e:React.FormEvent){e.preventDefault();setBusy(true);setMessage("");try{
  const result=await api.homeworkCreate({assignment_id:assignmentId,title,description,due_at:new Date(due).toISOString()});
  setMessage("تم إنشاء الواجب وإعداد إشعارات "+result.recipients+" حساباً.");setTitle("");setDescription("");setDue("");await reload();
 }catch(e){setMessage(e instanceof Error?e.message:"تعذر إنشاء الواجب");}finally{setBusy(false)}}
 return <section className="live-panel" dir="rtl"><h2>الواجبات الدراسية</h2>
 {role==="teacher"&&<form className="live-form" onSubmit={create}>
  <label>المادة والشعبة<select required value={assignmentId} onChange={e=>setAssignmentId(e.target.value)}><option value="">اختر التكليف</option>{assignments.map(a=><option key={a.id} value={a.id}>{a.subject||"المادة"} — الشعبة {a.section||"غير محددة"}</option>)}</select></label>
  <label>عنوان الواجب<input required maxLength={200} value={title} onChange={e=>setTitle(e.target.value)}/></label>
  <label>تفاصيل الواجب<textarea maxLength={5000} rows={4} value={description} onChange={e=>setDescription(e.target.value)}/></label>
  <label>آخر موعد للتسليم<input required type="datetime-local" value={due} onChange={e=>setDue(e.target.value)}/></label>
  <button disabled={busy||!assignmentId||!due}>{busy?"جاري الحفظ...":"نشر الواجب وإشعار الطلبة والأهالي"}</button>
 </form>}
 {message&&<p role="status">{message}</p>}
 <div className="table-wrap"><table><thead><tr><th>الواجب</th><th>التفاصيل</th><th>آخر موعد</th></tr></thead><tbody>{items.map(x=><tr key={x.id}><td>{x.title}</td><td>{x.description||"—"}</td><td>{new Date(x.due_at).toLocaleString("ar-IQ")}</td></tr>)}</tbody></table></div>
 {!items.length&&<p>لا توجد واجبات منشورة بعد.</p>}
 </section>;
}
