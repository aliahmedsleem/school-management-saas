from werkzeug.security import generate_password_hash
from app import create_app, db
from app.models import Tenant, School, User, Membership

def test_ambiguous_school_memberships_fail_closed():
    app = create_app({"TESTING": True, "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:", "SECRET_KEY": "test"})
    with app.app_context():
        db.create_all()
        tenant = Tenant(name="Organization")
        user = User(email="multi@example.com", password_hash=generate_password_hash("test-password"))
        db.session.add_all([tenant, user])
        db.session.flush()
        a = School(name="School A", tenant_id=tenant.id)
        b = School(name="School B", tenant_id=tenant.id)
        db.session.add_all([a, b])
        db.session.flush()
        db.session.add_all([
            Membership(tenant_id=tenant.id, school_id=a.id, user_id=user.id, role="registrar"),
            Membership(tenant_id=tenant.id, school_id=b.id, user_id=user.id, role="registrar"),
        ])
        db.session.commit()
        tenant_id, school_id = tenant.id, a.id
    client = app.test_client()
    login = client.post("/api/auth/login", json={"email":"multi@example.com","password":"test-password","tenant_id":tenant_id})
    assert login.status_code == 200
    response = client.get("/api/academics/students", query_string={"school_id": school_id})
    assert response.status_code == 403
    assert response.json["error"] == "membership_selection_required"
