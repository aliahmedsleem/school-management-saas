from werkzeug.security import generate_password_hash
from app import create_app, db
from app.models import Tenant, School, User, Membership, Student

def test_guardian_link_is_school_scoped_and_idempotent():
    app=create_app({"TESTING":True,"SQLALCHEMY_DATABASE_URI":"sqlite:///:memory:","SECRET_KEY":"test-only"})
    with app.app_context():
        db.create_all()
        tenant=Tenant(name="Tenant")
        principal=User(email="principal@test.invalid",password_hash=generate_password_hash("secure-password-123"))
        parent=User(email="parent@test.invalid",password_hash=generate_password_hash("secure-password-123"))
        db.session.add_all([tenant,principal,parent]);db.session.flush()
        a=School(tenant_id=tenant.id,name="A");b=School(tenant_id=tenant.id,name="B")
        db.session.add_all([a,b]);db.session.flush()
        child=Student(tenant_id=tenant.id,school_id=a.id,full_name="Child",student_code="A1")
        other=Student(tenant_id=tenant.id,school_id=b.id,full_name="Other",student_code="B1")
        pm=Membership(tenant_id=tenant.id,school_id=a.id,user_id=principal.id,role="principal")
        gm=Membership(tenant_id=tenant.id,school_id=a.id,user_id=parent.id,role="parent")
        db.session.add_all([child,other,pm,gm]);db.session.commit()
        tid=tenant.id;cid=child.id;oid=other.id;gid=gm.id;bid=b.id
    client=app.test_client()
    login=client.post("/api/auth/login",json={"email":"principal@test.invalid","password":"secure-password-123","tenant_id":tid})
    token=login.json["csrf_token"]
    headers={"X-CSRF-Token":token}
    assert client.post("/api/portals/guardians/link",json={"membership_id":gid,"student_id":oid},headers=headers).status_code==404
    assert client.get(f"/api/portals/school-students?school_id={bid}").status_code==403
    assert client.post("/api/portals/guardians/link",json={"membership_id":gid,"student_id":cid},headers=headers).status_code==201
    assert client.post("/api/portals/guardians/link",json={"membership_id":gid,"student_id":cid},headers=headers).json["already_linked"] is True
