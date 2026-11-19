import {useEffect,useState} from "react";
import {api} from "../services/api";
type Row={student_id:string;day:string;status:string;note:string};
const statusNames:Record<string,string>={present:"حاضر",absent:"غائب",late:"متأخر",excused:"غياب بعذر"};
export default function AttendancePanel({role,schools,children}:{role:string;schools:{id:string;name:string}[];children:{id:string;full_name:string;student_code:string}[]}) {
 const [school,setSchool]=useState("");
 const [day,setDay]=useState(new Date().toLocaleDateString("en-CA"));
 const [students,setStudents]=useState<{id:string;full_name:string;student_code:string}[]>([]);
 const [rows,setRows]=useState<Row[]>([]);
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 const [selectedChild,setSelectedChild]=useState("");
 const editor=["owner","principal","registrar"].includes(role);
 useEffect(()=>{if(!school&&schools.length)setSchool(schools[0].id)},[schools,school]);
 useEffect(()=>{
  if(editor) {
   if(!school)return;
   api.schoolStudents(school).then(r=>setStudents(r.items)).catch(()=>setStudents([]));
   api.attendanceSchool(school,day).then(r=>setRows(r.items)).catch(()=>setRows([]));
  }else{
   api.attendanceMine(role==="parent"?selectedChild||undefined:undefined).then(r=>setRows(r.items)).catch(()=>setRows([]));
  }
 },[editor,school,day,role,selectedChild]);
 async function save(student_id:string,status:string){
  setBusy(true);setError("");
  try {
   await api.attendanceSave({school_id:school,student_id,day,status,note:""});
   setRows((await api.attendanceSchool(school,day)).items);
  }catch(e){setError(e instanceof Error?e.message:"تعذر الحفظ");}
  finally{setBusy(false)}
 }
 return <section className="live-panel"><h2>الحضور والغياب</h2>
  {editor?<><p>تسجيل يومي مباشر مع التحقق من المدرسة والطالب.</p><div className="attendance-filters"><label>المدرسة<select value={school} onChange={e=>setSchool(e.target.value)}>{schools.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>التاريخ<input type="date" max={new Date().toLocaleDateString("en-CA")} value={day} onChange={e=>setDay(e.target.value)}/></label></div><div className="table-wrap"><table><thead><tr><th>الطالب</th><th>الرقم</th><th>الحالة</th><th>تحديث</th></tr></thead><tbody>{students.map(s=>{const record=rows.find(r=>r.student_id===s.id);return <tr key={s.id}><td>{s.full_name}</td><td>{s.student_code}</td><td>{record?statusNames[record.status]:"لم يسجل"}</td><td><select aria-label={"حضور "+s.full_name} disabled={busy} value={record?.status||""} onChange={e=>save(s.id,e.target.value)}><option value="" disabled>اختر الحالة</option>{Object.entries(statusNames).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></td></tr>})}</tbody></table></div></>:
  <><p>سجل الحضور الخاص {role==="parent"?"بأبنائك":"بك"} فقط.</p>{role==="parent"&&<label>الطالب<select value={selectedChild} onChange={e=>setSelectedChild(e.target.value)}><option value="">جميع الأبناء</option>{children.map(s=><option key={s.id} value={s.id}>{s.full_name}</option>)}</select></label>}<div className="table-wrap"><table><thead><tr><th>التاريخ</th>{role==="parent"&&<th>الطالب</th>}<th>الحالة</th><th>ملاحظة</th></tr></thead><tbody>{rows.map(r=><tr key={r.student_id+r.day}><td>{r.day}</td>{role==="parent"&&<td>{children.find(c=>c.id===r.student_id)?.full_name||"—"}</td>}<td>{statusNames[r.status]||r.status}</td><td>{r.note||"—"}</td></tr>)}</tbody></table></div></>}
  {error&&<p className="live-error" role="alert">{error}</p>}
 </section>;
}
