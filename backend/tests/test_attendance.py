from datetime import date
from werkzeug.security import generate_password_hash
from app import create_app, db
from app.models import Tenant, School, User, Membership, Student, StudentAccount, GuardianStudent

def test_attendance_school_entry_and_private_views():
    app=create_app({"TESTING":True,"SQLALCHEMY_DATABASE_URI":"sqlite:///:memory:","SECRET_KEY":"testing-only"})
    with app.app_context():
        db.create_all()
        tenant=Tenant(name="T")
        admin=User(email="admin@invalid.test",password_hash=generate_password_hash("secure-password-123"))
        learner=User(email="learner@invalid.test",password_hash=generate_password_hash("secure-password-123"))
        guardian=User(email="guardian@invalid.test",password_hash=generate_password_hash("secure-password-123"))
        db.session.add_all([tenant,admin,learner,guardian]);db.session.flush()
        a=School(tenant_id=tenant.id,name="A");b=School(tenant_id=tenant.id,name="B")
        db.session.add_all([a,b]);db.session.flush()
        s=Student(tenant_id=tenant.id,school_id=a.id,full_name="S",student_code="S01")
        foreign=Student(tenant_id=tenant.id,school_id=b.id,full_name="F",student_code="F01")
        db.session.add_all([s,foreign]);db.session.flush()
        db.session.add_all([
            Membership(tenant_id=tenant.id,school_id=a.id,user_id=admin.id,role="principal"),
            Membership(tenant_id=tenant.id,school_id=a.id,user_id=learner.id,role="student"),
            Membership(tenant_id=tenant.id,school_id=a.id,user_id=guardian.id,role="parent"),
            StudentAccount(user_id=learner.id,student_id=s.id),
            GuardianStudent(user_id=guardian.id,student_id=s.id),
        ])
        db.session.commit()
        tid=tenant.id;sid=a.id;student_id=s.id;other_id=foreign.id
    client=app.test_client()
    day=date.today().isoformat()
    login=client.post("/api/auth/login",json={"email":"admin@invalid.test","password":"secure-password-123","tenant_id":tid})
    headers={"X-CSRF-Token":login.json["csrf_token"]}
    payload={"school_id":sid,"student_id":student_id,"day":day,"status":"present","note":""}
    assert client.post("/api/attendance/school",json=payload,headers=headers).status_code==200
    assert client.post("/api/attendance/school",json={**payload,"status":"absent"},headers=headers).status_code==200
    assert client.post("/api/attendance/school",json={**payload,"student_id":other_id},headers=headers).status_code==404
    assert len(client.get(f"/api/attendance/school?school_id={sid}&day={day}").json["items"])==1
    client.post("/api/auth/login",json={"email":"learner@invalid.test","password":"secure-password-123","tenant_id":tid})
    assert client.get("/api/attendance/mine").json["items"][0]["status"]=="absent"
    assert client.get(f"/api/attendance/school?school_id={sid}&day={day}").status_code==403
    client.post("/api/auth/login",json={"email":"guardian@invalid.test","password":"secure-password-123","tenant_id":tid})
    assert len(client.get("/api/attendance/mine").json["items"])==1
    assert client.get(f"/api/attendance/mine?student_id={other_id}").json["items"]==[]
