"""Smoke tests for additive communication schema and tenant-isolated inbox."""
import pytest
from app import create_app, db
from app.models import Tenant, User, Membership, School
from app.notification_models import Notification, Homework
from sqlalchemy import select
from app.notifications import enqueue

@pytest.fixture()
def app():
    application=create_app({"TESTING":True,"SQLALCHEMY_DATABASE_URI":"sqlite:///:memory:","SECRET_KEY":"test-key"})
    with application.app_context():
        db.create_all()
        yield application
        db.session.remove()
        db.drop_all()

def test_communication_schema(app):
    with app.app_context():
        assert Notification.__tablename__ in db.metadata.tables
        assert Homework.__tablename__ in db.metadata.tables

def test_enqueue_does_not_cross_tenants(app):
    with app.app_context():
        first=Tenant(name="First")
        second=Tenant(name="Second")
        member=User(email="guardian@example.test",password_hash="not-a-real-password")
        db.session.add_all([first,second,member])
        db.session.flush()
        db.session.add(Membership(tenant_id=second.id,user_id=member.id,role="parent"))
        db.session.flush()
        count=enqueue(first.id,[member.id],"homework","Test","Private")
        db.session.commit()
        assert count==0
        assert db.session.query(Notification).count()==0

def test_inbox_requires_login(app):
    response=app.test_client().get("/api/notifications")
    assert response.status_code==401

def test_enqueue_within_tenant(app):
    with app.app_context():
        tenant=Tenant(name="School Group")
        member=User(email="student@example.test",password_hash="test")
        db.session.add_all([tenant,member])
        db.session.flush()
        db.session.add(Membership(tenant_id=tenant.id,user_id=member.id,role="student"))
        db.session.flush()
        assert enqueue(tenant.id,[member.id,member.id],"grade","درجة","تحديث") == 1
        db.session.commit()
        assert db.session.query(Notification).count()==1

def test_notification_inbox_scoped_to_authenticated_user(app):
    with app.app_context():
        tenant=Tenant(name="School")
        first=User(email="first@example.test",password_hash="test")
        second=User(email="second@example.test",password_hash="test")
        db.session.add_all([tenant,first,second])
        db.session.flush()
        db.session.add_all([
            Membership(tenant_id=tenant.id,user_id=first.id,role="parent"),
            Membership(tenant_id=tenant.id,user_id=second.id,role="parent"),
        ])
        db.session.add(Notification(tenant_id=tenant.id,recipient_id=second.id,kind="grade",title="Private",body="Private",target_path=""))
        db.session.commit()
        client=app.test_client()
        with client.session_transaction() as sess:
            sess["user_id"]=first.id
            sess["tenant_id"]=tenant.id
        result=client.get("/api/notifications")
        assert result.status_code==200
        assert result.json["items"]==[]
        assert result.json["unread"]==0

def test_homework_requires_authentication(app):
    client=app.test_client()
    assert client.get("/api/homework").status_code==401
    assert client.post("/api/homework",json={}).status_code==401

def test_homework_student_cannot_publish(app):
    with app.app_context():
        tenant=Tenant(name="School")
        student=User(email="student-role@example.test",password_hash="test")
        db.session.add_all([tenant,student])
        db.session.flush()
        membership=Membership(tenant_id=tenant.id,user_id=student.id,role="student")
        db.session.add(membership)
        db.session.commit()
        client=app.test_client()
        with client.session_transaction() as sess:
            sess["user_id"]=student.id
            sess["tenant_id"]=tenant.id
            sess["membership_id"]=membership.id
            sess["csrf_token"]="test-csrf"
        response=client.post("/api/homework",json={"title":"Forbidden"},headers={"X-CSRF-Token":"test-csrf"})
        assert response.status_code==403

def test_notification_mark_read_cannot_access_other_user(app):
    with app.app_context():
        tenant=Tenant(name="School")
        first=User(email="read-first@example.test",password_hash="test")
        second=User(email="read-second@example.test",password_hash="test")
        db.session.add_all([tenant,first,second])
        db.session.flush()
        membership=Membership(tenant_id=tenant.id,user_id=first.id,role="parent")
        db.session.add_all([membership,Membership(tenant_id=tenant.id,user_id=second.id,role="parent")])
        note=Notification(tenant_id=tenant.id,recipient_id=second.id,kind="homework",title="Private",body="Private",target_path="")
        db.session.add(note)
        db.session.commit()
        client=app.test_client()
        with client.session_transaction() as sess:
            sess["user_id"]=first.id
            sess["tenant_id"]=tenant.id
            sess["membership_id"]=membership.id
            sess["csrf_token"]="test-csrf"
        response=client.post(f"/api/notifications/{note.id}/read",headers={"X-CSRF-Token":"test-csrf"})
        assert response.status_code==404
        db.session.refresh(note)
        assert note.read_at is None

def test_school_notice_reaches_tenant_wide_member_only(app):
    with app.app_context():
        tenant=Tenant(name="Group")
        db.session.add(tenant)
        db.session.flush()
        school=School(tenant_id=tenant.id,name="Campus")
        another=School(tenant_id=tenant.id,name="Other campus")
        global_member=User(email="group-owner@example.test",password_hash="test")
        school_member=User(email="campus-parent@example.test",password_hash="test")
        other_member=User(email="other-parent@example.test",password_hash="test")
        db.session.add_all([tenant,global_member,school_member,other_member])
        db.session.flush()
        db.session.add_all([school,another])
        db.session.flush()
        db.session.add_all([
            Membership(tenant_id=tenant.id,user_id=global_member.id,role="owner"),
            Membership(tenant_id=tenant.id,school_id=school.id,user_id=school_member.id,role="parent"),
            Membership(tenant_id=tenant.id,school_id=another.id,user_id=other_member.id,role="parent"),
        ])
        db.session.flush()
        assert enqueue(tenant.id,[global_member.id,school_member.id,other_member.id],
                       "attendance","Alert","Body",school_id=school.id)==2
        db.session.commit()
        assert {n.recipient_id for n in db.session.scalars(select(Notification)).all()}=={
            global_member.id,school_member.id}


def test_owner_overview_is_tenant_scoped_and_role_protected(app):
    with app.app_context():
        first = Tenant(name="First tenant")
        second = Tenant(name="Second tenant")
        owner = User(email="owner-overview@example.test", password_hash="test")
        outsider = User(email="student-overview@example.test", password_hash="test")
        db.session.add_all([first, second, owner, outsider])
        db.session.flush()
        db.session.add_all([
            School(tenant_id=first.id, name="First school"),
            School(tenant_id=second.id, name="Private second school"),
        ])
        owner_member = Membership(tenant_id=first.id, user_id=owner.id, role="owner")
        student_member = Membership(tenant_id=first.id, user_id=outsider.id, role="student")
        db.session.add_all([owner_member, student_member])
        db.session.commit()
        client = app.test_client()
        assert client.get("/api/owner/overview").status_code == 401
        with client.session_transaction() as sess:
            sess["user_id"] = outsider.id
            sess["tenant_id"] = first.id
            sess["membership_id"] = student_member.id
        assert client.get("/api/owner/overview").status_code == 403
        with client.session_transaction() as sess:
            sess["user_id"] = owner.id
            sess["tenant_id"] = first.id
            sess["membership_id"] = owner_member.id
        response = client.get("/api/owner/overview")
        assert response.status_code == 200
        assert response.json["schools_count"] == 1
        assert response.json["accounts_count"] == 2
        assert [s["name"] for s in response.json["schools"]] == ["First school"]
