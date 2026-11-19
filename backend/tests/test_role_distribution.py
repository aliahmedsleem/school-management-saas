from werkzeug.security import generate_password_hash
from app import create_app, db
from app.models import Tenant, School, User, Membership, Student

def test_account_distribution_is_role_scoped():
    app=create_app({"TESTING":True,"SQLALCHEMY_DATABASE_URI":"sqlite:///:memory:","SECRET_KEY":"test-only"})
    with app.app_context():
        db.create_all()
        tenant=Tenant(name="Test")
        users=[User(email=f"{role}@example.test",password_hash=generate_password_hash("secure-password-123")) for role in ("owner","principal","registrar")]
        db.session.add_all([tenant,*users]);db.session.flush()
        school=School(tenant_id=tenant.id,name="A")
        other=School(tenant_id=tenant.id,name="B")
        db.session.add_all([school,other]);db.session.flush()
        for user,role in zip(users,("owner","principal","registrar")):
            db.session.add(Membership(tenant_id=tenant.id,school_id=None if role=="owner" else school.id,user_id=user.id,role=role))
        student=Student(tenant_id=tenant.id,school_id=school.id,full_name="Test Child",student_code="S001")
        db.session.add(student);db.session.commit()
        tid=tenant.id;sid=school.id;other_id=other.id;student_id=student.id
    client=app.test_client()
    def login(role):
        result=client.post("/api/auth/login",json={"email":f"{role}@example.test","password":"secure-password-123","tenant_id":tid})
        assert result.status_code==200
        return {"X-CSRF-Token":result.json["csrf_token"]}
    principal_headers=login("principal")
    assert client.post("/api/portals/accounts",json={"email":"other-principal@example.test","password":"long-password-123","role":"principal","school_id":sid},headers=principal_headers).status_code==403
    assert client.post("/api/portals/accounts",json={"email":"wrong-school@example.test","password":"long-password-123","role":"teacher","school_id":other_id},headers=principal_headers).status_code==403
    registrar_headers=login("registrar")
    assert client.post("/api/academics/teachers",json={"school_id":sid,"full_name":"Not Allowed","employee_code":"T2"},headers=registrar_headers).status_code==403
    assert client.post("/api/academics/grades",json={"school_id":sid,"name":"Second"},headers=registrar_headers).status_code==403
    assert client.post("/api/learning/subjects",json={"school_id":sid,"name":"Math"},headers=registrar_headers).status_code==403
    assert client.post("/api/portals/accounts",json={"email":"new-teacher@example.test","password":"long-password-123","role":"teacher","school_id":sid},headers=registrar_headers).status_code==403
    assert client.post("/api/portals/accounts",json={"email":"new-parent@example.test","password":"long-password-123","role":"parent","school_id":sid,"record_id":student_id},headers=registrar_headers).status_code==201
    items=client.get("/api/portals/accounts").json["items"]
    assert all(item["role"] in ("student","parent") for item in items)
    owner_headers=login("owner")
    assert client.post("/api/portals/accounts",json={"email":"owner-created-teacher@example.test","password":"long-password-123","role":"teacher","school_id":sid},headers=owner_headers).status_code==403
    assert client.post("/api/portals/accounts",json={"email":"owner-created-registrar@example.test","password":"long-password-123","role":"registrar","school_id":sid},headers=owner_headers).status_code==403
    assert client.post("/api/portals/accounts",json={"email":"school-manager@example.test","password":"long-password-123","role":"principal","school_id":other_id},headers=owner_headers).status_code==201
\n    owner_items=client.get("/api/portals/accounts").json["items"]\n    assert all(item["role"] == "principal" for item in owner_items)\n