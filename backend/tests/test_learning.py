from werkzeug.security import generate_password_hash
from app import create_app, db
from app.models import (Tenant, School, User, Membership, Student, Teacher, GradeLevel,
                        ClassSection, AcademicYear, StudentEnrollment, Subject,
                        TeachingAssignment, StudentAccount, TeacherAccount, GuardianStudent)

def test_grades_are_scoped_to_enrolled_student_and_linked_family():
    app=create_app({"TESTING":True,"SQLALCHEMY_DATABASE_URI":"sqlite:///:memory:","SECRET_KEY":"test-only"})
    with app.app_context():
        db.create_all()
        t=Tenant(name="A")
        users=[User(email=f"{x}@example.test",password_hash=generate_password_hash("secure-password-123")) for x in ("admin","teacher","student","parent")]
        db.session.add_all([t,*users]);db.session.flush()
        s=School(tenant_id=t.id,name="School");db.session.add(s);db.session.flush()
        y=AcademicYear(tenant_id=t.id,school_id=s.id,name="2026")
        grade=GradeLevel(tenant_id=t.id,school_id=s.id,name="First")
        teacher=Teacher(tenant_id=t.id,school_id=s.id,full_name="Teacher",employee_code="T1")
        student=Student(tenant_id=t.id,school_id=s.id,full_name="Student",student_code="S1")
        subject=Subject(tenant_id=t.id,school_id=s.id,name="Math")
        db.session.add_all([y,grade,teacher,student,subject]);db.session.flush()
        section=ClassSection(tenant_id=t.id,school_id=s.id,grade_level_id=grade.id,name="A")
        db.session.add(section);db.session.flush()
        enrollment=StudentEnrollment(tenant_id=t.id,school_id=s.id,student_id=student.id,academic_year_id=y.id,section_id=section.id)
        assignment=TeachingAssignment(tenant_id=t.id,school_id=s.id,section_id=section.id,teacher_id=teacher.id,subject_id=subject.id)
        db.session.add_all([enrollment,assignment]);db.session.flush()
        for user,role in zip(users,("principal","teacher","student","parent")):
            db.session.add(Membership(tenant_id=t.id,school_id=s.id,user_id=user.id,role=role))
        db.session.add_all([TeacherAccount(user_id=users[1].id,teacher_id=teacher.id),StudentAccount(user_id=users[2].id,student_id=student.id),GuardianStudent(user_id=users[3].id,student_id=student.id)])
        db.session.commit()
        tid=t.id;sid=s.id;student_id=student.id;assignment_id=assignment.id
    client=app.test_client()
    teacher_login=client.post("/api/auth/login",json={"email":"teacher@example.test","password":"secure-password-123","tenant_id":tid})
    token=teacher_login.json["csrf_token"]
    payload={"school_id":sid,"student_id":student_id,"assignment_id":assignment_id,"assessment":"First month","score":87,"max_score":100}
    roster=client.get(f"/api/learning/teacher-roster?assignment_id={assignment_id}")
    assert roster.status_code==200
    assert [x["id"] for x in roster.json["items"]]==[student_id]
    assert client.post("/api/learning/grades",json={**payload,"score":float("inf")},headers={"X-CSRF-Token":token}).status_code==400
    assert client.post("/api/learning/grades",json=payload,headers={"X-CSRF-Token":token}).status_code==200
    assert client.post("/api/learning/subjects",json={"school_id":sid,"name":"Physics"},headers={"X-CSRF-Token":token}).status_code==403
    for role in ("student","parent"):
        client.post("/api/auth/login",json={"email":f"{role}@example.test","password":"secure-password-123","tenant_id":tid})
        response=client.get("/api/learning/mine")
        assert response.status_code==200
        assert response.json["grades"][0]["score"]==87
        assert client.get(f"/api/learning/catalog?school_id={sid}").status_code==403
