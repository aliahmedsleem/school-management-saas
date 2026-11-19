from datetime import datetime, timezone
from uuid import uuid4
from . import db

def uid():
    return str(uuid4())

class Tenant(db.Model):
    __tablename__ = "tenants"
    id = db.Column(db.String(36), primary_key=True, default=uid)
    name = db.Column(db.String(200), nullable=False)
    status = db.Column(db.String(24), nullable=False, default="trial")
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

class School(db.Model):
    __tablename__ = "schools"
    id = db.Column(db.String(36), primary_key=True, default=uid)
    tenant_id = db.Column(db.String(36), db.ForeignKey("tenants.id"), nullable=False, index=True)
    name = db.Column(db.String(200), nullable=False)
    country_code = db.Column(db.String(2), nullable=False, default="IQ")
    timezone = db.Column(db.String(64), nullable=False, default="Asia/Baghdad")

class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.String(36), primary_key=True, default=uid)
    email = db.Column(db.String(320), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

class Membership(db.Model):
    __tablename__ = "memberships"
    id = db.Column(db.String(36), primary_key=True, default=uid)
    tenant_id = db.Column(db.String(36), db.ForeignKey("tenants.id"), nullable=False, index=True)
    school_id = db.Column(db.String(36), db.ForeignKey("schools.id"), nullable=True)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    role = db.Column(db.String(48), nullable=False)
    __table_args__ = (db.UniqueConstraint("tenant_id", "school_id", "user_id", "role", name="uq_membership_scope_role"),)

class EducationSystem(db.Model):
    __tablename__ = "education_systems"
    id = db.Column(db.String(36), primary_key=True, default=uid)
    country_code = db.Column(db.String(2), nullable=False)
    code = db.Column(db.String(64), nullable=False, unique=True)
    name = db.Column(db.String(200), nullable=False)

class SubscriptionPlan(db.Model):
    __tablename__ = "subscription_plans"
    id = db.Column(db.String(36), primary_key=True, default=uid)
    code = db.Column(db.String(64), nullable=False, unique=True)
    name = db.Column(db.String(120), nullable=False)
    price_minor = db.Column(db.BigInteger, nullable=False, default=0)
    currency = db.Column(db.String(3), nullable=False, default="IQD")

class Subscription(db.Model):
    __tablename__ = "subscriptions"
    id = db.Column(db.String(36), primary_key=True, default=uid)
    tenant_id = db.Column(db.String(36), db.ForeignKey("tenants.id"), nullable=False, index=True)
    plan_id = db.Column(db.String(36), db.ForeignKey("subscription_plans.id"), nullable=False)
    status = db.Column(db.String(24), nullable=False, default="trial")
    starts_at = db.Column(db.DateTime(timezone=True), nullable=True)
    ends_at = db.Column(db.DateTime(timezone=True), nullable=True)

# Academic records are scoped by both tenant and school. Cross-tenant references
# are validated by API services; composite database constraints are planned next.
class AcademicYear(db.Model):
    __tablename__ = "academic_years"
    id = db.Column(db.String(36), primary_key=True, default=uid)
    tenant_id = db.Column(db.String(36), db.ForeignKey("tenants.id"), nullable=False, index=True)
    school_id = db.Column(db.String(36), db.ForeignKey("schools.id"), nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    starts_on = db.Column(db.Date, nullable=True)
    ends_on = db.Column(db.Date, nullable=True)
    __table_args__ = (db.UniqueConstraint("school_id", "name", name="uq_year_school_name"),)

class GradeLevel(db.Model):
    __tablename__ = "grade_levels"
    id = db.Column(db.String(36), primary_key=True, default=uid)
    tenant_id = db.Column(db.String(36), db.ForeignKey("tenants.id"), nullable=False, index=True)
    school_id = db.Column(db.String(36), db.ForeignKey("schools.id"), nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    stage = db.Column(db.String(100), nullable=False, default="middle")
    __table_args__ = (db.UniqueConstraint("school_id", "name", name="uq_grade_school_name"),)

class ClassSection(db.Model):
    __tablename__ = "class_sections"
    id = db.Column(db.String(36), primary_key=True, default=uid)
    tenant_id = db.Column(db.String(36), db.ForeignKey("tenants.id"), nullable=False, index=True)
    school_id = db.Column(db.String(36), db.ForeignKey("schools.id"), nullable=False, index=True)
    grade_level_id = db.Column(db.String(36), db.ForeignKey("grade_levels.id"), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    __table_args__ = (db.UniqueConstraint("grade_level_id", "name", name="uq_section_grade_name"),)

class Student(db.Model):
    __tablename__ = "students"
    id = db.Column(db.String(36), primary_key=True, default=uid)
    tenant_id = db.Column(db.String(36), db.ForeignKey("tenants.id"), nullable=False, index=True)
    school_id = db.Column(db.String(36), db.ForeignKey("schools.id"), nullable=False, index=True)
    full_name = db.Column(db.String(200), nullable=False)
    student_code = db.Column(db.String(60), nullable=False)
    __table_args__ = (db.UniqueConstraint("school_id", "student_code", name="uq_student_school_code"),)

class Teacher(db.Model):
    __tablename__ = "teachers"
    id = db.Column(db.String(36), primary_key=True, default=uid)
    tenant_id = db.Column(db.String(36), db.ForeignKey("tenants.id"), nullable=False, index=True)
    school_id = db.Column(db.String(36), db.ForeignKey("schools.id"), nullable=False, index=True)
    full_name = db.Column(db.String(200), nullable=False)
    employee_code = db.Column(db.String(60), nullable=False)
    __table_args__ = (db.UniqueConstraint("school_id", "employee_code", name="uq_teacher_school_code"),)

class StudentEnrollment(db.Model):
    __tablename__ = "student_enrollments"
    id = db.Column(db.String(36), primary_key=True, default=uid)
    tenant_id = db.Column(db.String(36), db.ForeignKey("tenants.id"), nullable=False, index=True)
    school_id = db.Column(db.String(36), db.ForeignKey("schools.id"), nullable=False, index=True)
    student_id = db.Column(db.String(36), db.ForeignKey("students.id"), nullable=False)
    academic_year_id = db.Column(db.String(36), db.ForeignKey("academic_years.id"), nullable=False)
    section_id = db.Column(db.String(36), db.ForeignKey("class_sections.id"), nullable=False)
    __table_args__ = (db.UniqueConstraint("student_id", "academic_year_id", name="uq_student_year"),)

class StudentAccount(db.Model):
    __tablename__ = "student_accounts"
    id = db.Column(db.String(36), primary_key=True, default=uid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, unique=True)
    student_id = db.Column(db.String(36), db.ForeignKey("students.id"), nullable=False, unique=True)

class TeacherAccount(db.Model):
    __tablename__ = "teacher_accounts"
    id = db.Column(db.String(36), primary_key=True, default=uid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, unique=True)
    teacher_id = db.Column(db.String(36), db.ForeignKey("teachers.id"), nullable=False, unique=True)

class GuardianStudent(db.Model):
    __tablename__ = "guardian_students"
    id = db.Column(db.String(36), primary_key=True, default=uid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    student_id = db.Column(db.String(36), db.ForeignKey("students.id"), nullable=False)
    __table_args__ = (db.UniqueConstraint("user_id", "student_id", name="uq_guardian_student"),)

class AttendanceRecord(db.Model):
    __tablename__ = "attendance_records"
    id = db.Column(db.String(36), primary_key=True, default=uid)
    tenant_id = db.Column(db.String(36), db.ForeignKey("tenants.id"), nullable=False, index=True)
    school_id = db.Column(db.String(36), db.ForeignKey("schools.id"), nullable=False, index=True)
    student_id = db.Column(db.String(36), db.ForeignKey("students.id"), nullable=False, index=True)
    day = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(16), nullable=False)
    note = db.Column(db.String(250), nullable=False, default="")
    recorded_by = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    __table_args__ = (
        db.UniqueConstraint("school_id", "student_id", "day", name="uq_attendance_school_student_day"),
        db.CheckConstraint("status IN ('present','absent','late','excused')", name="ck_attendance_status"),
    )

class Subject(db.Model):
    __tablename__ = "subjects"
    id = db.Column(db.String(36), primary_key=True, default=uid)
    tenant_id = db.Column(db.String(36), db.ForeignKey("tenants.id"), nullable=False, index=True)
    school_id = db.Column(db.String(36), db.ForeignKey("schools.id"), nullable=False, index=True)
    name = db.Column(db.String(150), nullable=False)
    __table_args__ = (db.UniqueConstraint("school_id","name",name="uq_subject_school_name"),)

class TeachingAssignment(db.Model):
    __tablename__ = "teaching_assignments"
    id = db.Column(db.String(36), primary_key=True, default=uid)
    tenant_id = db.Column(db.String(36), db.ForeignKey("tenants.id"), nullable=False, index=True)
    school_id = db.Column(db.String(36), db.ForeignKey("schools.id"), nullable=False, index=True)
    section_id = db.Column(db.String(36), db.ForeignKey("class_sections.id"), nullable=False)
    teacher_id = db.Column(db.String(36), db.ForeignKey("teachers.id"), nullable=False)
    subject_id = db.Column(db.String(36), db.ForeignKey("subjects.id"), nullable=False)
    __table_args__ = (db.UniqueConstraint("section_id","subject_id",name="uq_assignment_section_subject"),)

class TimetableEntry(db.Model):
    __tablename__ = "timetable_entries"
    id = db.Column(db.String(36), primary_key=True, default=uid)
    tenant_id = db.Column(db.String(36), db.ForeignKey("tenants.id"), nullable=False, index=True)
    school_id = db.Column(db.String(36), db.ForeignKey("schools.id"), nullable=False, index=True)
    assignment_id = db.Column(db.String(36), db.ForeignKey("teaching_assignments.id"), nullable=False)
    weekday = db.Column(db.Integer, nullable=False)
    period = db.Column(db.Integer, nullable=False)
    __table_args__ = (db.UniqueConstraint("assignment_id","weekday","period",name="uq_timetable_assignment_slot"),db.CheckConstraint("weekday BETWEEN 0 AND 6"),db.CheckConstraint("period BETWEEN 1 AND 12"))

class GradeRecord(db.Model):
    __tablename__ = "grade_records"
    id = db.Column(db.String(36), primary_key=True, default=uid)
    tenant_id = db.Column(db.String(36), db.ForeignKey("tenants.id"), nullable=False, index=True)
    school_id = db.Column(db.String(36), db.ForeignKey("schools.id"), nullable=False, index=True)
    student_id = db.Column(db.String(36), db.ForeignKey("students.id"), nullable=False, index=True)
    assignment_id = db.Column(db.String(36), db.ForeignKey("teaching_assignments.id"), nullable=False)
    assessment = db.Column(db.String(100), nullable=False)
    score = db.Column(db.Float, nullable=False)
    max_score = db.Column(db.Float, nullable=False)
    __table_args__ = (db.UniqueConstraint("student_id","assignment_id","assessment",name="uq_grade_student_assessment"),db.CheckConstraint("score >= 0"),db.CheckConstraint("max_score > 0"))
