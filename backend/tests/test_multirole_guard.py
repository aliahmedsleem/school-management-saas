from werkzeug.security import generate_password_hash
from app import create_app, db
from app.models import Tenant, School, User, Membership

def test_multirole_requires_explicit_membership_even_for_owner():
    app=create_app({"TESTING":True,"SQLALCHEMY_DATABASE_URI":"sqlite:///:memory:","SECRET_KEY":"test-only"})
    with app.app_context():
        db.create_all()
        tenant=Tenant(name="T")
        user=User(email="roles@example.test",password_hash=generate_password_hash("secure-password-123"))
        db.session.add_all([tenant,user]);db.session.flush()
        school=School(tenant_id=tenant.id,name="A")
        db.session.add(school);db.session.flush()
        owner=Membership(tenant_id=tenant.id,user_id=user.id,school_id=None,role="owner")
        principal=Membership(tenant_id=tenant.id,user_id=user.id,school_id=school.id,role="principal")
        db.session.add_all([owner,principal]);db.session.commit()
        tid=tenant.id;owner_id=owner.id;principal_id=principal.id
    client=app.test_client()
    login=client.post("/api/auth/login",json={"email":"roles@example.test","password":"secure-password-123","tenant_id":tid})
    assert login.status_code==200
    assert client.get("/api/auth/me").status_code==403
    assert client.get("/api/schools").status_code==403
    headers={"X-CSRF-Token":login.json["csrf_token"]}
    assert client.post("/api/portals/select-membership",json={"membership_id":principal_id},headers=headers).status_code==200
    assert client.get("/api/auth/me").json["role"]=="principal"
    assert client.post("/api/schools",json={"name":"Blocked"},headers=headers).status_code==403
    assert client.post("/api/portals/select-membership",json={"membership_id":owner_id},headers=headers).status_code==200
    assert client.get("/api/auth/me").json["role"]=="owner"
