import {useEffect,useState} from "react";
import {api} from "../services/api";
type Child={id:string;full_name:string;student_code:string};
type Profile={id:string;name:string;code:string;school_id:string};
type Grade={student_id:string;subject:string;assessment:string;score:number;max_score:number};
type Lesson={assignment_id:string;subject?:string;weekday:number;period:number};
type Attendance={id:string;student_id:string;day:string;status:string;note:string};
const week=["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
const status:Record<string,string>={present:"حاضر",absent:"غائب",late:"متأخر",excused:"بعذر"};
export default function FamilyPortal({role,page}:{role:"student"|"parent";page:string}){
 const [children,setChildren]=useState<Child[]>([]);
 const [profile,setProfile]=useState<Profile|null>(null);
 const [selected,setSelected]=useState("");
 const [grades,setGrades]=useState<Grade[]>([]);
 const [lessons,setLessons]=useState<Lesson[]>([]);
 const [attendance,setAttendance]=useState<Attendance[]>([]);
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(true);
 useEffect(()=>{
  let active=true;setLoading(true);setError("");
  Promise.all([api.learningMine(),api.attendanceMine(),role==="parent"?api.myStudents():api.myProfile()])
   .then(([learning,attendanceResult,person])=>{
    if(!active)return;
    setGrades(learning.grades);setLessons(learning.timetable);setAttendance(attendanceResult.items);
    if(role==="parent")setChildren((person as {items:Child[]}).items);
    else setProfile(person as Profile);
   }).catch(e=>{if(active)setError(e instanceof Error?e.message:"تعذر تحميل البيانات")})
   .finally(()=>{if(active)setLoading(false)});
  return()=>{active=false};
 },[role]);
 const visibleGrades=selected?grades.filter(g=>g.student_id===selected):grades;
 const visibleAttendance=selected?attendance.filter(a=>a.student_id===selected):attendance;
 const childName=(id:string)=>children.find(c=>c.id===id)?.full_name||profile?.name||"—";
 const subjects=Array.from(new Set(visibleGrades.map(g=>g.subject).filter(Boolean)));
 return <section className="live-panel family-portal" dir="rtl">
  <header className="family-head"><div><h2>بوابة الطالب وولي الأمر</h2><p>{role==="parent"?"متابعة الأبناء من حساب واحد":"ملفك الدراسي الشخصي"} — عرض فقط</p></div><span className="family-role">{role==="parent"?"ولي الأمر":"الطالب"}</span></header>
  {error&&<p role="alert" className="live-error">{error}</p>}
  {loading?<p>جاري تحميل البيانات...</p>:<>
   {role==="parent"?<div className="family-children"><label>اختر الطالب<select value={selected} onChange={e=>setSelected(e.target.value)}><option value="">جميع الأبناء</option>{children.map(c=><option key={c.id} value={c.id}>{c.full_name} — {c.student_code}</option>)}</select></label><p>الأبناء المرتبطون: {children.length}</p></div>:<div className="family-children"><strong>{profile?.name||"لم يربط حساب الطالب بسجله بعد"}</strong><span>{profile?.code||""}</span></div>}
   {page==="overview"&&<div className="family-stats"><div><strong>{role==="parent"?children.length:1}</strong><span>الطلبة</span></div><div><strong>{subjects.length}</strong><span>المواد ذات الدرجات</span></div><div><strong>{visibleAttendance.filter(a=>a.status==="absent").length}</strong><span>أيام الغياب المسجلة</span></div><div><strong>{visibleGrades.length}</strong><span>التقييمات</span></div></div>}
   {(page==="overview"||page==="learning")&&<><h3>الدرجات والتقييمات</h3><div className="table-wrap"><table><thead><tr>{role==="parent"&&<th>الطالب</th>}<th>المادة</th><th>التقييم</th><th>الدرجة</th></tr></thead><tbody>{visibleGrades.map((g,i)=><tr key={i}>{role==="parent"&&<td>{childName(g.student_id)}</td>}<td>{g.subject||"—"}</td><td>{g.assessment}</td><td>{g.score} / {g.max_score}</td></tr>)}</tbody></table>{!visibleGrades.length&&<p>لا توجد درجات مسجلة.</p>}</div><h3>الجدول الدراسي</h3><div className="table-wrap"><table><thead><tr><th>المادة</th><th>اليوم</th><th>الحصة</th></tr></thead><tbody>{lessons.map((l,i)=><tr key={i}><td>{l.subject||"—"}</td><td>{week[l.weekday]||"—"}</td><td>{l.period}</td></tr>)}</tbody></table>{!lessons.length&&<p>لا يوجد جدول مسجل.</p>}</div></>}
   {(page==="overview"||page==="attendance")&&<><h3>الحضور والغياب</h3><div className="table-wrap"><table><thead><tr>{role==="parent"&&<th>الطالب</th>}<th>التاريخ</th><th>الحالة</th><th>ملاحظات</th></tr></thead><tbody>{visibleAttendance.map(a=><tr key={a.id}>{role==="parent"&&<td>{childName(a.student_id)}</td>}<td>{a.day}</td><td>{status[a.status]||a.status}</td><td>{a.note||"—"}</td></tr>)}</tbody></table>{!visibleAttendance.length&&<p>لا توجد سجلات حضور.</p>}</div></>}
  </>}
 </section>;
}
