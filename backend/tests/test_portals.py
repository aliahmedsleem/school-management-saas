from werkzeug.security import generate_password_hash
from app import create_app, db
from app.models import Tenant, School, User, Membership, Student, GuardianStudent, StudentAccount

def test_parent_can_only_see_linked_children_and_cannot_read_academics():
    app=create_app({"TESTING":True,"SQLALCHEMY_DATABASE_URI":"sqlite:///:memory:","SECRET_KEY":"test-secret"})
    with app.app_context():
        db.create_all()
        a=Tenant(name="A");b=Tenant(name="B")
        parent=User(email="parent@example.test",password_hash=generate_password_hash("safe-password-123"))
        db.session.add_all([a,b,parent]);db.session.flush()
        school=School(tenant_id=a.id,name="A");other=School(tenant_id=b.id,name="B")
        db.session.add_all([school,other]);db.session.flush()
        child=Student(tenant_id=a.id,school_id=school.id,full_name="My Child",student_code="01")
        foreign=Student(tenant_id=b.id,school_id=other.id,full_name="Foreign Child",student_code="02")
        db.session.add_all([child,foreign]);db.session.flush()
        db.session.add_all([Membership(tenant_id=a.id,school_id=school.id,user_id=parent.id,role="parent"),
                            GuardianStudent(user_id=parent.id,student_id=child.id),
                            GuardianStudent(user_id=parent.id,student_id=foreign.id)])
        db.session.commit()
        aid=a.id;sid=school.id
    client=app.test_client()
    login=client.post("/api/auth/login",json={"email":"parent@example.test","password":"safe-password-123","tenant_id":aid})
    assert login.status_code==200
    response=client.get("/api/portals/my-students")
    assert response.status_code==200
    assert [s["full_name"] for s in response.json["items"]]==["My Child"]
    assert client.get(f"/api/academics/students?school_id={sid}").status_code==403
    assert client.get("/api/portals/accounts").status_code==403

def test_school_admin_can_create_scoped_student_account():
    app=create_app({"TESTING":True,"SQLALCHEMY_DATABASE_URI":"sqlite:///:memory:","SECRET_KEY":"test-secret"})
    with app.app_context():
        db.create_all()
        tenant=Tenant(name="A");admin=User(email="admin@example.test",password_hash=generate_password_hash("safe-password-123"))
        db.session.add_all([tenant,admin]);db.session.flush()
        school=School(tenant_id=tenant.id,name="A")
        db.session.add(school);db.session.flush()
        student=Student(tenant_id=tenant.id,school_id=school.id,full_name="Student",student_code="S01")
        db.session.add_all([student,Membership(tenant_id=tenant.id,school_id=school.id,user_id=admin.id,role="principal")])
        db.session.commit()
        tid=tenant.id;sid=school.id;student_id=student.id
    client=app.test_client()
    login=client.post("/api/auth/login",json={"email":"admin@example.test","password":"safe-password-123","tenant_id":tid})
    token=login.json["csrf_token"]
    response=client.post("/api/portals/accounts",json={"email":"student@example.test","password":"another-safe-password","role":"student","school_id":sid,"record_id":student_id},headers={"X-CSRF-Token":token})
    assert response.status_code==201
    assert client.get("/api/portals/accounts").status_code==200
