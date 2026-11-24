from werkzeug.security import generate_password_hash
from app import create_app, db
from app.models import Tenant, User, Membership, School

def test_edit_requires_scope_and_csrf():
    app = create_app({"TESTING": True, "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:", "SECRET_KEY": "test"})
    with app.app_context():
        db.create_all()
        a, b = Tenant(name="A"), Tenant(name="B")
        user = User(email="owner@example.com", password_hash=generate_password_hash("password-long-enough"))
        db.session.add_all([a, b, user])
        db.session.flush()
        sa, sb = School(tenant_id=a.id, name="A"), School(tenant_id=b.id, name="B")
        db.session.add_all([sa, sb, Membership(tenant_id=a.id, user_id=user.id, role="owner")])
        db.session.commit()
        tenant_id, school_a, school_b = a.id, sa.id, sb.id
    client = app.test_client()
    login = client.post("/api/auth/login", json={"email": "owner@example.com", "password": "password-long-enough", "tenant_id": tenant_id})
    assert login.status_code == 200
    headers = {"X-CSRF-Token": login.json["csrf_token"]}
    created = client.post("/api/academics/students", json={"school_id": school_a, "full_name": "Old", "student_code": "S001"}, headers=headers)
    assert created.status_code == 201
    record_id = created.json["id"]
    assert client.patch(f"/api/academics/students/{record_id}", json={"full_name": "New"}).status_code == 403
    assert client.patch(f"/api/academics/students/{record_id}", json={"school_id": school_b}, headers=headers).status_code == 400
    changed = client.patch(f"/api/academics/students/{record_id}", json={"full_name": "New"}, headers=headers)
    assert changed.status_code == 200
    assert changed.json["full_name"] == "New"
    assert client.patch("/api/academics/students/missing", json={"full_name": "X"}, headers=headers).status_code == 404
