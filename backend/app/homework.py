from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g
from sqlalchemy import select
from . import db
from .security import require_membership
from .models import TeachingAssignment, TeacherAccount, StudentEnrollment, StudentAccount, GuardianStudent, Student, Subject
from .notification_models import Homework
from .notifications import enqueue

homework = Blueprint("homework", __name__, url_prefix="/api/homework")

def serialize(item):
    return dict(id=item.id,assignment_id=item.assignment_id,school_id=item.school_id,
                title=item.title,description=item.description,
                due_at=item.due_at.isoformat(),created_at=item.created_at.isoformat())

@homework.post("")
@require_membership("teacher", "principal", "owner")
def create_homework():
    data=request.get_json(silent=True) or {}
    assignment=db.session.scalar(select(TeachingAssignment).where(
        TeachingAssignment.id==data.get("assignment_id"),
        TeachingAssignment.tenant_id==g.tenant_id))
    if not assignment or (g.membership.school_id and g.membership.school_id!=assignment.school_id):
        return jsonify(error="forbidden"),403
    if g.membership.role=="teacher":
        link=db.session.scalar(select(TeacherAccount).where(TeacherAccount.user_id==g.user_id))
        if not link or link.teacher_id!=assignment.teacher_id:
            return jsonify(error="forbidden"),403
    title=data.get("title")
    description=data.get("description","")
    if not isinstance(title,str) or not 1<=len(title.strip())<=200 or not isinstance(description,str) or len(description)>5000:
        return jsonify(error="invalid_homework"),400
    try:
        due_at=datetime.fromisoformat(data.get("due_at",""))
        if due_at.tzinfo is None or due_at.astimezone(timezone.utc)<=datetime.now(timezone.utc):
            raise ValueError()
    except (ValueError,TypeError):
        return jsonify(error="invalid_due_at"),400
    obj=Homework(tenant_id=g.tenant_id,school_id=assignment.school_id,
                 assignment_id=assignment.id,created_by=g.user_id,
                 title=title.strip(),description=description,due_at=due_at)
    db.session.add(obj)
    db.session.flush()
    student_ids=set(db.session.scalars(select(StudentEnrollment.student_id).where(
        StudentEnrollment.tenant_id==g.tenant_id,
        StudentEnrollment.school_id==assignment.school_id,
        StudentEnrollment.section_id==assignment.section_id)).all())
    recipients=set()
    subject=db.session.get(Subject,assignment.subject_id)
    subject_name=subject.name if subject else "المادة الدراسية"
    # Individualize parent notifications so the child is identifiable without leaking names across families.
    for student_id in student_ids:
        student=db.session.scalar(select(Student).where(Student.id==student_id,
            Student.tenant_id==g.tenant_id,Student.school_id==assignment.school_id))
        if not student:continue
        student_users=db.session.scalars(select(StudentAccount.user_id).where(
            StudentAccount.student_id==student_id)).all()
        parent_users=db.session.scalars(select(GuardianStudent.user_id).where(
            GuardianStudent.student_id==student_id)).all()
        recipients.update(student_users)
        recipients.update(parent_users)
        enqueue(g.tenant_id,student_users,"homework","واجب دراسي جديد",
                f"لديك واجب جديد في مادة {subject_name}: {obj.title}.",assignment.school_id,g.user_id,"/homework")
        enqueue(g.tenant_id,parent_users,"homework","واجب جديد لابنك",
                f"عزيزي ولي الأمر، لدى التلميذ {student.full_name} واجب جديد في مادة {subject_name} بعنوان {obj.title}.",
                assignment.school_id,g.user_id,"/homework")
    db.session.commit()
    return jsonify(item=serialize(obj),recipients=len(recipients)),201

@homework.get("")
@require_membership("teacher","student","parent","principal","registrar","owner")
def list_homework():
    role=g.membership.role
    query=select(Homework).where(Homework.tenant_id==g.tenant_id)
    if g.membership.school_id:query=query.where(Homework.school_id==g.membership.school_id)
    if role=="teacher":
        link=db.session.scalar(select(TeacherAccount).where(TeacherAccount.user_id==g.user_id))
        if not link:return jsonify(items=[])
        ids=select(TeachingAssignment.id).where(TeachingAssignment.tenant_id==g.tenant_id,
                                                TeachingAssignment.teacher_id==link.teacher_id)
        query=query.where(Homework.assignment_id.in_(ids))
    elif role in ("student","parent"):
        if role=="student":
            student_ids=select(StudentAccount.student_id).where(StudentAccount.user_id==g.user_id)
        else:
            student_ids=select(GuardianStudent.student_id).where(GuardianStudent.user_id==g.user_id)
        section_ids=select(StudentEnrollment.section_id).where(
            StudentEnrollment.tenant_id==g.tenant_id,StudentEnrollment.student_id.in_(student_ids))
        assignment_ids=select(TeachingAssignment.id).where(
            TeachingAssignment.tenant_id==g.tenant_id,TeachingAssignment.section_id.in_(section_ids))
        query=query.where(Homework.assignment_id.in_(assignment_ids))
    rows=db.session.scalars(query.order_by(Homework.created_at.desc()).limit(100)).all()
    return jsonify(items=[serialize(x) for x in rows])
