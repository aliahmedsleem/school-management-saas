from datetime import datetime, timezone
from uuid import uuid4
from . import db

def uid():
    return str(uuid4())

class Tenant(db.Model):
    __tablename__ = "tenants"
    id = db.Column(db.String(36), primary_key=True, default=uid)
    name = db.Column(db.String(200), nullable=False)
    status = db.Column(db.String(24), nullable=False, default="trial")
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

class School(db.Model):
    __tablename__ = "schools"
    id = db.Column(db.String(36), primary_key=True, default=uid)
    tenant_id = db.Column(db.String(36), db.ForeignKey("tenants.id"), nullable=False, index=True)
    name = db.Column(db.String(200), nullable=False)
    country_code = db.Column(db.String(2), nullable=False, default="IQ")
    timezone = db.Column(db.String(64), nullable=False, default="Asia/Baghdad")

class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.String(36), primary_key=True, default=uid)
    email = db.Column(db.String(320), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

class Membership(db.Model):
    __tablename__ = "memberships"
    id = db.Column(db.String(36), primary_key=True, default=uid)
    tenant_id = db.Column(db.String(36), db.ForeignKey("tenants.id"), nullable=False, index=True)
    school_id = db.Column(db.String(36), db.ForeignKey("schools.id"), nullable=True)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    role = db.Column(db.String(48), nullable=False)
    __table_args__ = (db.UniqueConstraint("tenant_id", "school_id", "user_id", "role", name="uq_membership_scope_role"),)

class EducationSystem(db.Model):
    __tablename__ = "education_systems"
    id = db.Column(db.String(36), primary_key=True, default=uid)
    country_code = db.Column(db.String(2), nullable=False)
    code = db.Column(db.String(64), nullable=False, unique=True)
    name = db.Column(db.String(200), nullable=False)

class SubscriptionPlan(db.Model):
    __tablename__ = "subscription_plans"
    id = db.Column(db.String(36), primary_key=True, default=uid)
    code = db.Column(db.String(64), nullable=False, unique=True)
    name = db.Column(db.String(120), nullable=False)
    price_minor = db.Column(db.BigInteger, nullable=False, default=0)
    currency = db.Column(db.String(3), nullable=False, default="IQD")

class Subscription(db.Model):
    __tablename__ = "subscriptions"
    id = db.Column(db.String(36), primary_key=True, default=uid)
    tenant_id = db.Column(db.String(36), db.ForeignKey("tenants.id"), nullable=False, index=True)
    plan_id = db.Column(db.String(36), db.ForeignKey("subscription_plans.id"), nullable=False)
    status = db.Column(db.String(24), nullable=False, default="trial")
    starts_at = db.Column(db.DateTime(timezone=True), nullable=True)
    ends_at = db.Column(db.DateTime(timezone=True), nullable=True)
