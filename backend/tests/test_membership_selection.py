from werkzeug.security import generate_password_hash
from app import create_app, db
from app.models import Tenant, School, User, Membership

def test_multiple_school_memberships_require_explicit_selection():
    app=create_app({"TESTING":True,"SQLALCHEMY_DATABASE_URI":"sqlite:///:memory:","SECRET_KEY":"test-secret"})
    with app.app_context():
        db.create_all()
        tenant=Tenant(name="A")
        user=User(email="principal@example.test",password_hash=generate_password_hash("safe-password-123"))
        db.session.add_all([tenant,user]);db.session.flush()
        a=School(tenant_id=tenant.id,name="A")
        b=School(tenant_id=tenant.id,name="B")
        db.session.add_all([a,b]);db.session.flush()
        ma=Membership(tenant_id=tenant.id,school_id=a.id,user_id=user.id,role="principal")
        mb=Membership(tenant_id=tenant.id,school_id=b.id,user_id=user.id,role="principal")
        db.session.add_all([ma,mb]);db.session.commit()
        tid=tenant.id;aid=a.id;bid=b.id;mid=ma.id
    client=app.test_client()
    login=client.post("/api/auth/login",json={"email":"principal@example.test","password":"safe-password-123","tenant_id":tid})
    assert login.status_code==200
    assert len(login.json["memberships"])==2
    assert client.get("/api/portals/context").status_code==403
    chosen=client.post("/api/portals/select-membership",json={"membership_id":mid},headers={"X-CSRF-Token":login.json["csrf_token"]})
    assert chosen.status_code==200
    context=client.get("/api/portals/context")
    assert context.status_code==200
    assert context.json["school_id"]==aid
    assert [s["id"] for s in context.json["schools"]]==[aid]
    assert client.get(f"/api/academics/students?school_id={bid}").status_code==403
