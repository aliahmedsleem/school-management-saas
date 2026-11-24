from flask import Blueprint, jsonify, request, g
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from . import db
from .models import School, AcademicYear, GradeLevel, ClassSection, Student, Teacher, StudentEnrollment
from .security import require_membership

academics = Blueprint("academics", __name__, url_prefix="/api/academics")
WRITERS = ("owner", "principal", "registrar")
MODELS = {
    "years": (AcademicYear, ("name",), ("starts_on", "ends_on")),
    "grades": (GradeLevel, ("name",), ("stage",)),
    "sections": (ClassSection, ("name", "grade_level_id"), ()),
    "students": (Student, ("full_name", "student_code"), ("address", "guardian_name", "guardian_phone", "guardian_email")),
    "teachers": (Teacher, ("full_name", "employee_code"), ()),
    "enrollments": (StudentEnrollment, ("student_id", "academic_year_id", "section_id"), ()),
}
LINKS = {
    "grade_level_id": GradeLevel,
    "student_id": Student,
    "academic_year_id": AcademicYear,
    "section_id": ClassSection,
}

def serialize(obj, required, optional):
    keys = ("id", "school_id", *required, *optional, *(('qr_token',) if isinstance(obj, Student) else ()))
    return {key: (value.isoformat() if hasattr(value, "isoformat") else value)
            for key in keys
            if (value := getattr(obj, key, None)) is not None}

def scope_school(school_id):
    return db.session.scalar(select(School).where(
        School.id == school_id, School.tenant_id == g.tenant_id))

def valid_link(key, value, school_id):
    model = LINKS[key]
    return db.session.scalar(select(model.id).where(
        model.id == value, model.tenant_id == g.tenant_id,
        model.school_id == school_id)) is not None

@academics.get("/<kind>")
@require_membership("owner", "principal", "registrar")
def list_records(kind):
    if kind not in MODELS:
        return jsonify(error="unknown_resource"), 404
    school_id = request.args.get("school_id")
    if not school_id or not scope_school(school_id):
        return jsonify(error="school_not_found"), 404
    # School-scoped roles must not enumerate other schools in their tenant.
    if g.membership.school_id and g.membership.school_id != school_id:
        return jsonify(error="forbidden"), 403
    model, required, optional = MODELS[kind]
    order_field = Student.full_name if kind == "students" else model.id
    limit = 500 if kind == "students" else 100
    records = db.session.scalars(select(model).where(
        model.tenant_id == g.tenant_id, model.school_id == school_id
    ).order_by(order_field).limit(limit)).all()
    return jsonify(items=[serialize(r, required, optional) for r in records])

@academics.post("/<kind>")
@require_membership(*WRITERS)
def create_record(kind):
    if kind not in MODELS:
        return jsonify(error="unknown_resource"), 404
    if g.membership.role == "registrar" and kind not in {"students", "enrollments"}:
        return jsonify(error="forbidden"), 403
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify(error="invalid_json"), 400
    school_id = data.get("school_id")
    if not isinstance(school_id, str) or not scope_school(school_id):
        return jsonify(error="school_not_found"), 404
    if g.membership.school_id and g.membership.school_id != school_id:
        return jsonify(error="forbidden"), 403
    model, required, optional = MODELS[kind]
    values = {}
    for key in required:
        value = data.get(key)
        if not isinstance(value, str) or not value.strip() or len(value) > 200:
            return jsonify(error="invalid_field", field=key), 400
        values[key] = value.strip()
    for key in optional:
        if key in data:
            if key in ("starts_on", "ends_on"):
                from datetime import date
                try:
                    values[key] = date.fromisoformat(data[key])
                except (ValueError, TypeError):
                    return jsonify(error="invalid_date", field=key), 400
            elif isinstance(data[key], str) and len(data[key]) <= (320 if key == "guardian_email" else 300 if key == "address" else 200):
                values[key] = data[key].strip()
            else:
                return jsonify(error="invalid_field", field=key), 400
    if values.get("guardian_email") and "@" not in values["guardian_email"]:
        return jsonify(error="invalid_field", field="guardian_email"), 400
    for key, value in values.items():
        if key in LINKS and not valid_link(key, value, school_id):
            return jsonify(error="invalid_reference", field=key), 400
    obj = model(tenant_id=g.tenant_id, school_id=school_id, **values)
    db.session.add(obj)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify(error="duplicate_or_invalid_record"), 409
    return jsonify(serialize(obj, required, optional)), 201

@academics.patch("/<kind>/<record_id>")
@require_membership(*WRITERS)
def update_record(kind, record_id):
    if kind not in MODELS:
        return jsonify(error="unknown_resource"), 404
    if g.membership.role == "registrar" and kind not in {"students", "enrollments"}:
        return jsonify(error="forbidden"), 403
    model, required, optional = MODELS[kind]
    obj = db.session.scalar(select(model).where(
        model.id == record_id, model.tenant_id == g.tenant_id
    ))
    if obj is None:
        return jsonify(error="record_not_found"), 404
    if g.membership.school_id and g.membership.school_id != obj.school_id:
        return jsonify(error="forbidden"), 403
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or not data:
        return jsonify(error="invalid_json"), 400
    allowed = set(required) | set(optional)
    if not set(data).issubset(allowed):
        return jsonify(error="invalid_field"), 400
    from datetime import date
    for key, value in data.items():
        if key in ("starts_on", "ends_on"):
            try:
                value = date.fromisoformat(value) if value is not None else None
            except (ValueError, TypeError):
                return jsonify(error="invalid_date", field=key), 400
        elif not isinstance(value, str) or (key in required and not value.strip()) or len(value) > (320 if key == "guardian_email" else 300 if key == "address" else 200):
            return jsonify(error="invalid_field", field=key), 400
        else:
            value = value.strip()
        if key == "guardian_email" and value and ("@" not in value or len(value) > 320):
            return jsonify(error="invalid_field", field=key), 400
        if key in LINKS and not valid_link(key, value, obj.school_id):
            return jsonify(error="invalid_reference", field=key), 400
        setattr(obj, key, value)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify(error="duplicate_or_invalid_record"), 409
    return jsonify(serialize(obj, required, optional))

@academics.delete("/<kind>/<record_id>")
@require_membership(*WRITERS)
def delete_record(kind, record_id):
    if kind not in MODELS:
        return jsonify(error="unknown_resource"), 404
    if g.membership.role == "registrar" and kind not in {"students", "enrollments"}:
        return jsonify(error="forbidden"), 403
    model, _, _ = MODELS[kind]
    obj = db.session.scalar(select(model).where(model.id == record_id, model.tenant_id == g.tenant_id))
    if obj is None:
        return jsonify(error="record_not_found"), 404
    if g.membership.school_id and g.membership.school_id != obj.school_id:
        return jsonify(error="forbidden"), 403
    # Refuse deletion when the record participates in other school data. This
    # prevents accidental loss of attendance, grades, accounts or enrollments.
    if kind == "students":
        from .models import StudentEnrollment, StudentAccount, GuardianStudent, AttendanceRecord, GradeRecord
        linked = any(db.session.scalar(select(m.id).where(c == obj.id).limit(1)) for m, c in (
            (StudentEnrollment, StudentEnrollment.student_id), (StudentAccount, StudentAccount.student_id),
            (GuardianStudent, GuardianStudent.student_id), (AttendanceRecord, AttendanceRecord.student_id),
            (GradeRecord, GradeRecord.student_id)))
        if linked:
            return jsonify(error="record_in_use"), 409
    db.session.delete(obj)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify(error="record_in_use"), 409
    return jsonify(ok=True)
