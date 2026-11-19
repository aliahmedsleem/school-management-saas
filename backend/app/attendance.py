from datetime import date
from flask import Blueprint, jsonify, request, g
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from . import db
from .models import AttendanceRecord, Student, School, StudentAccount, GuardianStudent
from .security import require_membership
from .notifications import enqueue
from .models import GuardianStudent, StudentAccount

attendance = Blueprint("attendance", __name__, url_prefix="/api/attendance")
STATUSES = {"present", "absent", "late", "excused"}

def parse_day(raw):
    try:
        return date.fromisoformat(raw)
    except (ValueError, TypeError):
        return None

def student_in_school(student_id, school_id):
    return db.session.scalar(select(Student).where(
        Student.id == student_id, Student.school_id == school_id,
        Student.tenant_id == g.tenant_id
    ))

def school_allowed(school_id):
    if g.membership.school_id and g.membership.school_id != school_id:
        return False
    return db.session.scalar(select(School.id).where(
        School.id == school_id, School.tenant_id == g.tenant_id
    )) is not None

def item(record):
    return {"id": record.id, "student_id": record.student_id,
            "day": record.day.isoformat(), "status": record.status, "note": record.note}

@attendance.get("/school")
@require_membership("owner", "principal", "registrar")
def school_attendance():
    school_id = request.args.get("school_id")
    day = parse_day(request.args.get("day"))
    if not school_id or not school_allowed(school_id):
        return jsonify(error="forbidden"), 403
    if not day:
        return jsonify(error="invalid_day"), 400
    records = db.session.scalars(select(AttendanceRecord).where(
        AttendanceRecord.tenant_id == g.tenant_id,
        AttendanceRecord.school_id == school_id,
        AttendanceRecord.day == day
    ).order_by(AttendanceRecord.student_id).limit(1000)).all()
    return jsonify(items=[item(r) for r in records])

@attendance.post("/school")
@require_membership("owner", "principal", "registrar")
def record_attendance():
    data = request.get_json(silent=True) or {}
    school_id, student_id = data.get("school_id"), data.get("student_id")
    day = parse_day(data.get("day"))
    status = data.get("status")
    note = data.get("note", "")
    if not isinstance(school_id, str) or not school_allowed(school_id):
        return jsonify(error="forbidden"), 403
    if not isinstance(student_id, str) or not student_in_school(student_id, school_id):
        return jsonify(error="student_not_found"), 404
    if not day or day > date.today() or status not in STATUSES or not isinstance(note, str) or len(note) > 250:
        return jsonify(error="invalid_attendance"), 400
    record = db.session.scalar(select(AttendanceRecord).where(
        AttendanceRecord.tenant_id == g.tenant_id,
        AttendanceRecord.school_id == school_id,
        AttendanceRecord.student_id == student_id,
        AttendanceRecord.day == day
    ))
    previous_status = record.status if record is not None else None
    if record is None:
        record = AttendanceRecord(tenant_id=g.tenant_id, school_id=school_id,
                                  student_id=student_id, day=day,
                                  status=status, note=note, recorded_by=g.user_id)
        db.session.add(record)
    else:
        record.status, record.note, record.recorded_by = status, note, g.user_id
    if status in ("absent", "late") and previous_status != status:
        student = student_in_school(student_id, school_id)
        guardians = db.session.scalars(select(GuardianStudent.user_id).where(GuardianStudent.student_id == student_id)).all()
        students = db.session.scalars(select(StudentAccount.user_id).where(StudentAccount.student_id == student_id)).all()
        label = "غياب" if status == "absent" else "تأخر"
        body = f"عزيزي ولي الأمر، تم تسجيل {label} للتلميذ {student.full_name} بتاريخ {day.isoformat()}. يرجى مراجعة المدرسة عند الحاجة."
        enqueue(g.tenant_id, guardians, "attendance", f"تنبيه {label} الطالب", body, school_id, g.user_id, "/attendance")
        enqueue(g.tenant_id, students, "attendance", f"تنبيه {label}", f"تم تسجيل {label} في سجلك بتاريخ {day.isoformat()}.", school_id, g.user_id, "/attendance")
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify(error="attendance_conflict"), 409
    return jsonify(item(record))

@attendance.get("/mine")
@require_membership("student", "parent")
def my_attendance():
    requested = request.args.get("student_id")
    if g.membership.role == "student":
        link = db.session.scalar(select(StudentAccount).where(StudentAccount.user_id == g.user_id))
        allowed_ids = {link.student_id} if link else set()
    else:
        links = db.session.scalars(select(GuardianStudent).where(GuardianStudent.user_id == g.user_id)).all()
        allowed_ids = {link.student_id for link in links}
    if requested:
        allowed_ids &= {requested}
    if not allowed_ids:
        return jsonify(items=[])
    permitted = db.session.scalars(select(Student.id).where(
        Student.id.in_(allowed_ids), Student.tenant_id == g.tenant_id,
        *([Student.school_id == g.membership.school_id] if g.membership.school_id else [])
    )).all()
    if not permitted:
        return jsonify(items=[])
    records = db.session.scalars(select(AttendanceRecord).where(
        AttendanceRecord.tenant_id == g.tenant_id,
        AttendanceRecord.student_id.in_(permitted),
        *([AttendanceRecord.school_id == g.membership.school_id] if g.membership.school_id else [])
    ).order_by(AttendanceRecord.day.desc()).limit(100)).all()
    return jsonify(items=[item(r) for r in records])
