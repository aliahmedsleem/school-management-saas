from werkzeug.security import generate_password_hash
from app import create_app, db
from app.models import Tenant, User, Membership, School

def test_tenant_scoped_schools():
    app = create_app({"TESTING": True, "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:", "SECRET_KEY": "test-only"})
    with app.app_context():
        db.create_all()
        a, b = Tenant(name="A"), Tenant(name="B")
        user = User(email="owner@example.com", password_hash=generate_password_hash("safe-password-123"))
        db.session.add_all([a,b,user])
        db.session.flush()
        db.session.add_all([
            Membership(tenant_id=a.id,user_id=user.id,role="owner"),
            School(tenant_id=a.id,name="School A"),
            School(tenant_id=b.id,name="School B")
        ])
        db.session.commit()
        aid, bid = a.id, b.id
    client = app.test_client()
    assert client.get("/api/schools").status_code == 401
    assert client.post("/api/auth/login", json={"email":"owner@example.com","password":"safe-password-123","tenant_id":bid}).status_code == 401
    response = client.post("/api/auth/login", json={"email":"owner@example.com","password":"safe-password-123","tenant_id":aid})
    assert response.status_code == 200
    schools = client.get("/api/schools")
    assert schools.status_code == 200
    assert [s["name"] for s in schools.json["items"]] == ["School A"]
