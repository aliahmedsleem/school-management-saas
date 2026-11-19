from flask import Blueprint, jsonify, g, request, session
from sqlalchemy import select
from werkzeug.security import generate_password_hash
from sqlalchemy.exc import IntegrityError
from . import db
from .security import require_membership
from .models import User, Membership, School, Student, Teacher, StudentAccount, TeacherAccount, GuardianStudent, StudentEnrollment, AcademicYear, ClassSection

portals = Blueprint("portals", __name__, url_prefix="/api/portals")
ROLES = {"owner", "principal", "registrar", "teacher", "student", "parent"}

def memberships_for_user():
    return db.session.scalars(select(Membership).where(Membership.user_id == g.user_id, Membership.tenant_id == g.tenant_id)).all()

@portals.get("/context")
@require_membership()
def context():
    members = memberships_for_user()
    selected = g.membership
    school_ids = {m.school_id for m in members if m.school_id}
    if selected.school_id:
        school_ids = {selected.school_id}
    schools = db.session.scalars(select(School).where(School.tenant_id == g.tenant_id, *([School.id.in_(school_ids)] if selected.school_id else []))).all()
    return jsonify(role=selected.role, school_id=selected.school_id,
                   schools=[{"id": s.id, "name": s.name} for s in schools],
                   memberships=[{"id": m.id, "role": m.role, "school_id": m.school_id} for m in members])

@portals.post("/select-membership")
def select_membership():
    if not session.get("user_id") or not session.get("tenant_id"):
        return jsonify(error="authentication_required"), 401
    data = request.get_json(silent=True) or {}
    membership = db.session.scalar(select(Membership).where(
        Membership.id == data.get("membership_id"),
        Membership.user_id == session["user_id"],
        Membership.tenant_id == session["tenant_id"]
    ))
    if not membership:
        return jsonify(error="forbidden"), 403
    session["membership_id"] = membership.id
    return jsonify(role=membership.role, school_id=membership.school_id)

@portals.get("/my-students")
@require_membership("parent")
def my_students():
    links = db.session.scalars(select(GuardianStudent).where(GuardianStudent.user_id == g.user_id)).all()
    ids = [link.student_id for link in links]
    school_id = g.membership.school_id
    records = db.session.scalars(select(Student).where(
        Student.id.in_(ids), Student.tenant_id == g.tenant_id,
        *([Student.school_id == school_id] if school_id else [])
    )).all() if ids else []
    return jsonify(items=[{"id": s.id, "full_name": s.full_name, "student_code": s.student_code} for s in records])

@portals.get("/my-profile")
@require_membership("student", "teacher")
def my_profile():
    if g.membership.role == "student":
        link = db.session.scalar(select(StudentAccount).where(StudentAccount.user_id == g.user_id))
        model = Student
    else:
        link = db.session.scalar(select(TeacherAccount).where(TeacherAccount.user_id == g.user_id))
        model = Teacher
    if not link:
        return jsonify(error="account_not_linked"), 404
    person_id = link.student_id if model is Student else link.teacher_id
    record = db.session.scalar(select(model).where(model.id == person_id, model.tenant_id == g.tenant_id,
        *([model.school_id == g.membership.school_id] if g.membership.school_id else [])))
    if not record:
        return jsonify(error="account_not_linked"), 404
    return jsonify(id=record.id, name=record.full_name, school_id=record.school_id,
                   code=record.student_code if model is Student else record.employee_code)

@portals.get("/accounts")
@require_membership("owner", "principal")
def accounts():
    scope = g.membership.school_id
    members = db.session.scalars(select(Membership).where(
        Membership.tenant_id == g.tenant_id,
        *([Membership.school_id == scope] if scope else [])
    ).limit(200)).all()
    users = {u.id:u for u in db.session.scalars(select(User).where(User.id.in_([m.user_id for m in members]))).all()} if members else {}
    return jsonify(items=[{"id":m.id,"email":users[m.user_id].email,"role":m.role,"school_id":m.school_id}
                          for m in members if m.user_id in users])

@portals.post("/accounts")
@require_membership("owner", "principal")
def add_account():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email","")).strip().lower()
    password = data.get("password","")
    role = data.get("role")
    school_id = data.get("school_id")
    record_id = data.get("record_id")
    if role not in ROLES or role == "owner" or not isinstance(password,str) or len(password)<12 or len(password)>128 or "@" not in email:
        return jsonify(error="invalid_account"), 400
    if g.membership.role == "principal" and role == "principal":
        return jsonify(error="forbidden"), 403
    if role in {"teacher","student","parent","registrar","principal"} and not school_id:
        return jsonify(error="school_required"), 400
    if g.membership.school_id and school_id != g.membership.school_id:
        return jsonify(error="forbidden"), 403
    if school_id and not db.session.scalar(select(School.id).where(School.id==school_id,School.tenant_id==g.tenant_id)):
        return jsonify(error="school_not_found"), 404
    if role in {"student","teacher"}:
        model = Student if role == "student" else Teacher
        if not record_id or not db.session.scalar(select(model.id).where(model.id==record_id,model.tenant_id==g.tenant_id,model.school_id==school_id)):
            return jsonify(error="invalid_reference"), 400
    if role == "parent" and record_id:
        if not db.session.scalar(select(Student.id).where(Student.id==record_id,Student.tenant_id==g.tenant_id,Student.school_id==school_id)):
            return jsonify(error="invalid_reference"), 400
    if db.session.scalar(select(User.id).where(User.email==email)):
        return jsonify(error="email_exists"), 409
    user = User(email=email,password_hash=generate_password_hash(password))
    db.session.add(user)
    db.session.flush()
    membership = Membership(user_id=user.id,tenant_id=g.tenant_id,school_id=school_id,role=role)
    db.session.add(membership)
    if role=="student":
        db.session.add(StudentAccount(user_id=user.id,student_id=record_id))
    elif role=="teacher":
        db.session.add(TeacherAccount(user_id=user.id,teacher_id=record_id))
    elif role=="parent" and record_id:
        db.session.add(GuardianStudent(user_id=user.id,student_id=record_id))
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify(error="duplicate_or_invalid_record"),409
    return jsonify(id=membership.id,email=user.email,role=role,school_id=school_id),201

@portals.post("/guardians/link")
@require_membership("owner", "principal", "registrar")
def link_guardian():
    data = request.get_json(silent=True) or {}
    membership_id = data.get("membership_id")
    student_id = data.get("student_id")
    membership = db.session.scalar(select(Membership).where(
        Membership.id == membership_id,
        Membership.tenant_id == g.tenant_id,
        Membership.role == "parent",
    ))
    if not membership or not membership.school_id:
        return jsonify(error="guardian_not_found"), 404
    if g.membership.school_id and g.membership.school_id != membership.school_id:
        return jsonify(error="forbidden"), 403
    student = db.session.scalar(select(Student).where(
        Student.id == student_id,
        Student.tenant_id == g.tenant_id,
        Student.school_id == membership.school_id,
    ))
    if not student:
        return jsonify(error="student_not_found"), 404
    existing = db.session.scalar(select(GuardianStudent).where(
        GuardianStudent.user_id == membership.user_id,
        GuardianStudent.student_id == student.id,
    ))
    if existing:
        return jsonify(ok=True, already_linked=True)
    db.session.add(GuardianStudent(user_id=membership.user_id, student_id=student.id))
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify(error="duplicate_or_invalid_record"), 409
    return jsonify(ok=True), 201

@portals.get("/school-students")
@require_membership("owner", "principal", "registrar")
def school_students():
    school_id = request.args.get("school_id", "")
    if g.membership.school_id and school_id != g.membership.school_id:
        return jsonify(error="forbidden"), 403
    if not db.session.scalar(select(School.id).where(
        School.id == school_id, School.tenant_id == g.tenant_id
    )):
        return jsonify(error="school_not_found"), 404
    students = db.session.scalars(select(Student).where(
        Student.tenant_id == g.tenant_id, Student.school_id == school_id
    ).order_by(Student.full_name).limit(500)).all()
    return jsonify(items=[{"id": s.id, "full_name": s.full_name, "student_code": s.student_code} for s in students])

@portals.get("/school-teachers")
@require_membership("owner", "principal", "registrar")
def school_teachers():
    school_id = request.args.get("school_id", "")
    if g.membership.school_id and school_id != g.membership.school_id:
        return jsonify(error="forbidden"), 403
    if not db.session.scalar(select(School.id).where(
        School.id == school_id, School.tenant_id == g.tenant_id
    )):
        return jsonify(error="school_not_found"), 404
    teachers = db.session.scalars(select(Teacher).where(
        Teacher.tenant_id == g.tenant_id, Teacher.school_id == school_id
    ).order_by(Teacher.full_name).limit(500)).all()
    return jsonify(items=[{"id": t.id, "full_name": t.full_name, "employee_code": t.employee_code} for t in teachers])
