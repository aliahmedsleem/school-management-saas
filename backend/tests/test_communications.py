"""Smoke tests for additive communication schema and tenant-isolated inbox."""
import pytest
from app import create_app, db
from app.models import Tenant, User, Membership
from app.notification_models import Notification, Homework
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
