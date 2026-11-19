import {useEffect,useState, type ReactNode} from "react";
import {api} from "../services/api";
const days=["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
type Catalog={subjects:{id:string;name:string}[];assignments:{id:string;section_id:string;teacher_id:string;subject_id:string}[]};
export default function LearningPanel({role,schools}:{role:string;schools:{id:string;name:string}[]}) {
 const [school,setSchool]=useState("");
 const [catalog,setCatalog]=useState<Catalog>({subjects:[],assignments:[]});
 const [sections,setSections]=useState<{id:string;name:string}[]>([]);
 const [teachers,setTeachers]=useState<{id:string;full_name:string}[]>([]);
 const [students,setStudents]=useState<{id:string;full_name:string}[]>([]);
 const [mine,setMine]=useState<{grades:{student_id:string;subject:string;assessment:string;score:number;max_score:number}[];timetable:{assignment_id:string;subject?:string;weekday:number;period:number}[];students?:{id:string;name:string}[];assignments?:{id:string;section_id:string;subject_id:string}[]}|null>(null);
 const [subject,setSubject]=useState("");
 const [section,setSection]=useState("");
 const [teacher,setTeacher]=useState("");
 const [subjectId,setSubjectId]=useState("");
 const [assignment,setAssignment]=useState("");
 const [weekday,setWeekday]=useState(0);
 const [period,setPeriod]=useState(1);
 const [student,setStudent]=useState("");
 const [assessment,setAssessment]=useState("");
 const [score,setScore]=useState("");
 const [maxScore,setMaxScore]=useState("100");
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);
 const editor=["owner","principal","registrar"].includes(role);
 const canAssign=["owner","principal"].includes(role);
 useEffect(()=>{if(!school&&schools.length)setSchool(schools[0].id)},[schools,school]);
 async function refresh(){if(!school)return;try{setCatalog(await api.learningCatalog(school));const [a,b,c]=await Promise.all([api.list("sections",school),api.schoolTeachers(school),api.schoolStudents(school)]);setSections(a.items.map(x=>({id:x.id,name:String(x.name||x.id)})));setTeachers(b.items);setStudents(c.items);}catch(e){setMessage(e instanceof Error?e.message:"تعذر جلب البيانات")}}
 useEffect(()=>{if(editor)refresh();else api.learningMine().then(setMine).catch(e=>setMessage(e instanceof Error?e.message:"تعذر جلب البيانات"));},[school,role]);
 async function submit(fn:()=>Promise<unknown>){setBusy(true);setMessage("");try{await fn();setMessage("تم الحفظ بنجاح");await refresh()}catch(e){setMessage(e instanceof Error?e.message:"تعذر الحفظ")}finally{setBusy(false)}}
 const label=(text:string,control:ReactNode)=><label>{text}{control}</label>;
 const option=(items:{id:string;name:string}[])=><>{items.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</>;
 return <section className="live-panel"><h2>المواد والجداول والدرجات</h2>
 {editor?<><div className="attendance-filters">{label("المدرسة",<select value={school} onChange={e=>setSchool(e.target.value)}>{option(schools)}</select>)}</div>
 <div className="learning-grid"><form className="live-form" onSubmit={e=>{e.preventDefault();submit(()=>api.learningSubject({school_id:school,name:subject}))}}><h3>إضافة مادة</h3>{label("اسم المادة",<input required maxLength={150} value={subject} onChange={e=>setSubject(e.target.value)}/>)}<button disabled={busy||!school}>إضافة المادة</button></form>
 {canAssign&&<form className="live-form" onSubmit={e=>{e.preventDefault();submit(()=>api.learningAssignment({school_id:school,section_id:section,teacher_id:teacher,subject_id:subjectId}))}}><h3>ربط مدرس بمادة وشعبة</h3>{label("الشعبة",<select required value={section} onChange={e=>setSection(e.target.value)}><option value="">اختر</option>{option(sections)}</select>)}{label("المدرس",<select required value={teacher} onChange={e=>setTeacher(e.target.value)}><option value="">اختر</option>{option(teachers.map(t=>({id:t.id,name:t.full_name})))}</select>)}{label("المادة",<select required value={subjectId} onChange={e=>setSubjectId(e.target.value)}><option value="">اختر</option>{option(catalog.subjects)}</select>)}<button disabled={busy}>حفظ الربط</button></form>}
 {canAssign&&<form className="live-form" onSubmit={e=>{e.preventDefault();submit(()=>api.learningTimetable({school_id:school,assignment_id:assignment,weekday,period}))}}><h3>إضافة حصة</h3>{label("التكليف",<select required value={assignment} onChange={e=>setAssignment(e.target.value)}><option value="">اختر</option>{catalog.assignments.map(a=><option key={a.id} value={a.id}>{catalog.subjects.find(s=>s.id===a.subject_id)?.name||"مادة"} — {sections.find(s=>s.id===a.section_id)?.name||"شعبة"}</option>)}</select>)}{label("اليوم",<select value={weekday} onChange={e=>setWeekday(Number(e.target.value))}>{days.map((d,i)=><option key={i} value={i}>{d}</option>)}</select>)}{label("الحصة",<input type="number" min={1} max={12} value={period} onChange={e=>setPeriod(Number(e.target.value))}/>)}<button disabled={busy}>إضافة الحصة</button></form>}
 {canAssign&&<form className="live-form" onSubmit={e=>{e.preventDefault();submit(()=>api.learningGrade({school_id:school,student_id:student,assignment_id:assignment,assessment,score:Number(score),max_score:Number(maxScore)}))}}><h3>إدخال درجة</h3>{label("الطالب",<select required value={student} onChange={e=>setStudent(e.target.value)}><option value="">اختر</option>{option(students.map(s=>({id:s.id,name:s.full_name})))}</select>)}{label("التكليف",<select required value={assignment} onChange={e=>setAssignment(e.target.value)}><option value="">اختر</option>{catalog.assignments.map(a=><option key={a.id} value={a.id}>{catalog.subjects.find(s=>s.id===a.subject_id)?.name||"مادة"} — {sections.find(s=>s.id===a.section_id)?.name||"شعبة"}</option>)}</select>)}{label("نوع التقييم",<input required maxLength={100} value={assessment} onChange={e=>setAssessment(e.target.value)}/>)}{label("الدرجة",<input required type="number" step="0.01" min="0" value={score} onChange={e=>setScore(e.target.value)}/>)}{label("من",<input required type="number" step="0.01" min="0.01" value={maxScore} onChange={e=>setMaxScore(e.target.value)}/>)}<button disabled={busy}>حفظ الدرجة</button></form>}</div>
 <p>المواد: {catalog.subjects.length} | تكليفات التدريس: {catalog.assignments.length}</p></>:
 <><p>تظهر هنا بياناتك أو بيانات أبنائك المصرح بها فقط.</p><h3>الجدول الدراسي</h3><div className="table-wrap"><table><thead><tr><th>المادة</th><th>اليوم</th><th>الحصة</th></tr></thead><tbody>{mine?.timetable.map((t,i)=><tr key={i}><td>{t.subject||t.assignment_id}</td><td>{days[t.weekday]}</td><td>{t.period}</td></tr>)}</tbody></table></div>{role!=="teacher"&&<><h3>الدرجات</h3><div className="table-wrap"><table><thead><tr><th>الطالب</th><th>المادة</th><th>التقييم</th><th>النتيجة</th></tr></thead><tbody>{mine?.grades.map((g,i)=><tr key={i}><td>{mine.students?.find(s=>s.id===g.student_id)?.name||"—"}</td><td>{g.subject}</td><td>{g.assessment}</td><td>{g.score} / {g.max_score}</td></tr>)}</tbody></table></div></>}</>}
 {message&&<p role="status">{message}</p>}</section>;
}
