from werkzeug.security import generate_password_hash
from app import create_app, db
from app.models import Tenant, User, Membership, School

def test_academic_tenant_and_school_isolation():
    app = create_app({"TESTING": True, "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:", "SECRET_KEY": "test"})
    with app.app_context():
        db.create_all()
        a, b = Tenant(name="A"), Tenant(name="B")
        user = User(email="admin@example.com", password_hash=generate_password_hash("strong-password-123"))
        db.session.add_all([a, b, user])
        db.session.flush()
        sa = School(tenant_id=a.id, name="A school")
        sb = School(tenant_id=b.id, name="B school")
        db.session.add_all([sa, sb, Membership(tenant_id=a.id, user_id=user.id, role="owner")])
        db.session.commit()
        aid, bid = a.id, sa.id
        other_school = sb.id
    client = app.test_client()
    login = client.post("/api/auth/login", json={"email": "admin@example.com", "password": "strong-password-123", "tenant_id": aid})
    assert login.status_code == 200
    csrf = {"X-CSRF-Token": login.json["csrf_token"]}
    assert client.post("/api/academics/students", json={"school_id": other_school, "full_name": "Wrong", "student_code": "1"}, headers=csrf).status_code == 404
    created = client.post("/api/academics/students", json={"school_id": bid, "full_name": "Student One", "student_code": "1"}, headers=csrf)
    assert created.status_code == 201
    listed = client.get("/api/academics/students", query_string={"school_id": bid})
    assert listed.status_code == 200
    assert len(listed.json["items"]) == 1
    assert client.get("/api/academics/students", query_string={"school_id": other_school}).status_code == 404

def test_school_membership_restriction():
    app = create_app({"TESTING": True, "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:", "SECRET_KEY": "test"})
    with app.app_context():
        db.create_all()
        tenant = Tenant(name="Tenant")
        user = User(email="registrar@example.com", password_hash=generate_password_hash("strong-password-123"))
        db.session.add_all([tenant, user])
        db.session.flush()
        school1 = School(tenant_id=tenant.id, name="School 1")
        school2 = School(tenant_id=tenant.id, name="School 2")
        db.session.add_all([school1, school2])
        db.session.flush()
        db.session.add(Membership(tenant_id=tenant.id, school_id=school1.id, user_id=user.id, role="registrar"))
        db.session.commit()
        tid, forbidden_school = tenant.id, school2.id
    client = app.test_client()
    login = client.post("/api/auth/login", json={"email": "registrar@example.com", "password": "strong-password-123", "tenant_id": tid})
    assert login.status_code == 200
    assert client.get("/api/academics/students", query_string={"school_id": forbidden_school}).status_code == 403
