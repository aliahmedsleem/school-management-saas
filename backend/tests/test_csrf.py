from werkzeug.security import generate_password_hash
from app import create_app, db
from app.models import Tenant, User, Membership

def test_csrf_required_for_mutations():
    app = create_app({"TESTING": True, "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:", "SECRET_KEY": "test-only"})
    with app.app_context():
        db.create_all()
        tenant = Tenant(name="Test")
        user = User(email="owner@example.com", password_hash=generate_password_hash("password-long-enough"))
        db.session.add_all([tenant, user])
        db.session.flush()
        db.session.add(Membership(tenant_id=tenant.id, user_id=user.id, role="owner"))
        db.session.commit()
        tid = tenant.id
    client = app.test_client()
    response = client.post("/api/auth/login", json={"email":"owner@example.com","password":"password-long-enough","tenant_id":tid})
    assert response.status_code == 200
    assert client.post("/api/schools", json={"name":"Test School"}).status_code == 403
    token = response.json["csrf_token"]
    assert client.post("/api/schools", json={"name":"Test School"}, headers={"X-CSRF-Token":token}).status_code == 201
