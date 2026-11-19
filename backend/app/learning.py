import math
from flask import Blueprint, jsonify, request, g
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from . import db
from .security import require_membership
from .notifications import enqueue
from .models import (School, Student, Teacher, StudentEnrollment, ClassSection,
                     Subject, TeachingAssignment, TimetableEntry, GradeRecord,
                     StudentAccount, TeacherAccount, GuardianStudent)

learning = Blueprint("learning", __name__, url_prefix="/api/learning")

def scope(school_id):
    if not isinstance(school_id,str) or (g.membership.school_id and g.membership.school_id != school_id):
        return False
    return db.session.scalar(select(School.id).where(School.id==school_id,School.tenant_id==g.tenant_id)) is not None

def find(model, record_id, school_id):
    return db.session.scalar(select(model).where(model.id==record_id,model.school_id==school_id,model.tenant_id==g.tenant_id))

def commit():
    try:
        db.session.commit()
        return None
    except IntegrityError:
        db.session.rollback()
        return (jsonify(error="duplicate_or_invalid_reference"),409)

@learning.get("/catalog")
@require_membership("owner","principal","registrar")
def catalog():
    school_id=request.args.get("school_id")
    if not scope(school_id): return jsonify(error="forbidden"),403
    subjects=db.session.scalars(select(Subject).where(Subject.tenant_id==g.tenant_id,Subject.school_id==school_id)).all()
    assignments=db.session.scalars(select(TeachingAssignment).where(TeachingAssignment.tenant_id==g.tenant_id,TeachingAssignment.school_id==school_id)).all()
    return jsonify(subjects=[{"id":s.id,"name":s.name} for s in subjects],
                   assignments=[{"id":a.id,"section_id":a.section_id,"teacher_id":a.teacher_id,"subject_id":a.subject_id} for a in assignments])

@learning.post("/subjects")
@require_membership("owner","principal")
def add_subject():
    d=request.get_json(silent=True) or {}
    school_id=d.get("school_id");name=str(d.get("name","")).strip()
    if not scope(school_id):return jsonify(error="forbidden"),403
    if not 1<=len(name)<=150:return jsonify(error="invalid_subject"),400
    obj=Subject(tenant_id=g.tenant_id,school_id=school_id,name=name)
    db.session.add(obj);err=commit()
    return err if err else (jsonify(id=obj.id,name=obj.name),201)

@learning.post("/assignments")
@require_membership("owner","principal")
def add_assignment():
    d=request.get_json(silent=True) or {};sid=d.get("school_id")
    if not scope(sid):return jsonify(error="forbidden"),403
    if not all([find(ClassSection,d.get("section_id"),sid),find(Teacher,d.get("teacher_id"),sid),find(Subject,d.get("subject_id"),sid)]):
        return jsonify(error="invalid_reference"),400
    obj=TeachingAssignment(tenant_id=g.tenant_id,school_id=sid,section_id=d["section_id"],teacher_id=d["teacher_id"],subject_id=d["subject_id"])
    db.session.add(obj);err=commit()
    return err if err else (jsonify(id=obj.id),201)

@learning.post("/timetable")
@require_membership("owner","principal")
def add_timetable():
    d=request.get_json(silent=True) or {};sid=d.get("school_id")
    if not scope(sid):return jsonify(error="forbidden"),403
    assignment=find(TeachingAssignment,d.get("assignment_id"),sid)
    weekday,period=d.get("weekday"),d.get("period")
    if not assignment or type(weekday)!=int or type(period)!=int or not(0<=weekday<=6 and 1<=period<=12):
        return jsonify(error="invalid_slot"),400
    # A section or teacher cannot be assigned to two lessons in the same slot.
    occupied=db.session.scalars(select(TimetableEntry).where(TimetableEntry.tenant_id==g.tenant_id,TimetableEntry.school_id==sid,TimetableEntry.weekday==weekday,TimetableEntry.period==period)).all()
    for entry in occupied:
        existing=find(TeachingAssignment,entry.assignment_id,sid)
        if existing and (existing.section_id==assignment.section_id or existing.teacher_id==assignment.teacher_id):
            return jsonify(error="slot_conflict"),409
    obj=TimetableEntry(tenant_id=g.tenant_id,school_id=sid,assignment_id=assignment.id,weekday=weekday,period=period)
    db.session.add(obj);err=commit()
    return err if err else (jsonify(id=obj.id),201)

@learning.post("/grades")
@require_membership("owner","principal","teacher")
def save_grade():
    d=request.get_json(silent=True) or {};sid=d.get("school_id")
    if not scope(sid):return jsonify(error="forbidden"),403
    student=find(Student,d.get("student_id"),sid)
    assignment=find(TeachingAssignment,d.get("assignment_id"),sid)
    if not student or not assignment:return jsonify(error="invalid_reference"),400
    if g.membership.role=="teacher":
        teacher_link=db.session.scalar(select(TeacherAccount).where(TeacherAccount.user_id==g.user_id))
        if not teacher_link or teacher_link.teacher_id!=assignment.teacher_id:return jsonify(error="forbidden"),403
    enrolled=db.session.scalar(select(StudentEnrollment.id).where(StudentEnrollment.tenant_id==g.tenant_id,StudentEnrollment.school_id==sid,StudentEnrollment.student_id==student.id,StudentEnrollment.section_id==assignment.section_id))
    if not enrolled:return jsonify(error="student_not_enrolled_in_section"),400
    assessment=d.get("assessment")
    score,max_score=d.get("score"),d.get("max_score")
    if not isinstance(assessment,str) or not 1<=len(assessment.strip())<=100 or type(score) not in (int,float) or type(max_score) not in (int,float) or not(math.isfinite(score) and math.isfinite(max_score)) or not(0<=score<=max_score and 0<max_score<=1000):
        return jsonify(error="invalid_grade"),400
    obj=db.session.scalar(select(GradeRecord).where(GradeRecord.tenant_id==g.tenant_id,GradeRecord.school_id==sid,GradeRecord.student_id==student.id,GradeRecord.assignment_id==assignment.id,GradeRecord.assessment==assessment.strip()))
    if obj is None:
        obj=GradeRecord(tenant_id=g.tenant_id,school_id=sid,student_id=student.id,assignment_id=assignment.id,assessment=assessment.strip())
        db.session.add(obj)
    obj.score=float(score);obj.max_score=float(max_score)
    student_users=db.session.scalars(select(StudentAccount.user_id).where(StudentAccount.student_id==student.id)).all()
    guardian_users=db.session.scalars(select(GuardianStudent.user_id).where(GuardianStudent.student_id==student.id)).all()
    subject=db.session.get(Subject,assignment.subject_id)
    subject_name=subject.name if subject and subject.tenant_id==g.tenant_id else "المادة الدراسية"
    enqueue(g.tenant_id,student_users,"grade","درجة جديدة",
            f"تم تسجيل درجة {assessment.strip()} في مادة {subject_name}.",
            sid,g.user_id,"/learning")
    enqueue(g.tenant_id,guardian_users,"grade","تحديث درجات الطالب",
            f"عزيزي ولي الأمر، تم تسجيل درجة جديدة للتلميذ {student.full_name} في مادة {subject_name}.",
            sid,g.user_id,"/learning")
    err=commit()
    return err if err else jsonify(id=obj.id,score=obj.score,max_score=obj.max_score)

@learning.get("/mine")
@require_membership("student","parent","teacher")
def mine():
    role=g.membership.role
    if role=="teacher":
        link=db.session.scalar(select(TeacherAccount).where(TeacherAccount.user_id==g.user_id))
        assignments=db.session.scalars(select(TeachingAssignment).where(TeachingAssignment.teacher_id==link.teacher_id,TeachingAssignment.tenant_id==g.tenant_id,*([TeachingAssignment.school_id==g.membership.school_id] if g.membership.school_id else []))).all() if link else []
        ids=[a.id for a in assignments]
        lessons=db.session.scalars(select(TimetableEntry).where(TimetableEntry.assignment_id.in_(ids),TimetableEntry.tenant_id==g.tenant_id)).all() if ids else []
        return jsonify(assignments=[{"id":a.id,"section_id":a.section_id,"subject_id":a.subject_id,"school_id":a.school_id} for a in assignments],timetable=[{"assignment_id":x.assignment_id,"weekday":x.weekday,"period":x.period} for x in lessons],grades=[])
    if role=="student":
        link=db.session.scalar(select(StudentAccount).where(StudentAccount.user_id==g.user_id))
        ids=[link.student_id] if link else []
    else:
        links=db.session.scalars(select(GuardianStudent).where(GuardianStudent.user_id==g.user_id)).all()
        ids=[x.student_id for x in links]
    students=db.session.scalars(select(Student).where(Student.id.in_(ids),Student.tenant_id==g.tenant_id,*([Student.school_id==g.membership.school_id] if g.membership.school_id else []))).all() if ids else []
    allowed_ids=[s.id for s in students]
    grades=db.session.scalars(select(GradeRecord).where(GradeRecord.student_id.in_(allowed_ids),GradeRecord.tenant_id==g.tenant_id,*([GradeRecord.school_id==g.membership.school_id] if g.membership.school_id else []))).all() if allowed_ids else []
    enrollments=db.session.scalars(select(StudentEnrollment).where(StudentEnrollment.student_id.in_(allowed_ids),StudentEnrollment.tenant_id==g.tenant_id,*([StudentEnrollment.school_id==g.membership.school_id] if g.membership.school_id else []))).all() if allowed_ids else []
    section_ids=[e.section_id for e in enrollments]
    assignments=db.session.scalars(select(TeachingAssignment).where(TeachingAssignment.section_id.in_(section_ids),TeachingAssignment.tenant_id==g.tenant_id)).all() if section_ids else []
    lessons=db.session.scalars(select(TimetableEntry).where(TimetableEntry.assignment_id.in_([a.id for a in assignments]),TimetableEntry.tenant_id==g.tenant_id)).all() if assignments else []
    subjects=db.session.scalars(select(Subject).where(Subject.id.in_([a.subject_id for a in assignments]),Subject.tenant_id==g.tenant_id)).all() if assignments else []
    names={s.id:s.name for s in subjects};subject_by_assignment={a.id:names.get(a.subject_id,"") for a in assignments}
    return jsonify(grades=[{"student_id":x.student_id,"subject":subject_by_assignment.get(x.assignment_id,""),"assessment":x.assessment,"score":x.score,"max_score":x.max_score} for x in grades],
                   timetable=[{"assignment_id":x.assignment_id,"subject":subject_by_assignment.get(x.assignment_id,""),"weekday":x.weekday,"period":x.period} for x in lessons],
                   students=[{"id":s.id,"name":s.full_name} for s in students])

@learning.get("/teacher-roster")
@require_membership("teacher")
def teacher_roster():
    assignment_id = request.args.get("assignment_id")
    link = db.session.scalar(select(TeacherAccount).where(TeacherAccount.user_id == g.user_id))
    if not link:
        return jsonify(error="teacher_account_not_linked"), 404
    assignment = db.session.scalar(select(TeachingAssignment).where(
        TeachingAssignment.id == assignment_id,
        TeachingAssignment.teacher_id == link.teacher_id,
        TeachingAssignment.tenant_id == g.tenant_id,
        *([TeachingAssignment.school_id == g.membership.school_id] if g.membership.school_id else [])
    ))
    if not assignment:
        return jsonify(error="forbidden"), 403
    enrollments = db.session.scalars(select(StudentEnrollment).where(
        StudentEnrollment.tenant_id == g.tenant_id,
        StudentEnrollment.school_id == assignment.school_id,
        StudentEnrollment.section_id == assignment.section_id
    )).all()
    student_ids = [e.student_id for e in enrollments]
    students = db.session.scalars(select(Student).where(
        Student.id.in_(student_ids),
        Student.tenant_id == g.tenant_id,
        Student.school_id == assignment.school_id
    ).order_by(Student.full_name)).all() if student_ids else []
    return jsonify(items=[{"id":s.id,"name":s.full_name,"student_code":s.student_code} for s in students])
