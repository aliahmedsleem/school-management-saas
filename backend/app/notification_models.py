from datetime import datetime, timezone
from . import db
from .models import uid

class Notification(db.Model):
    __tablename__ = "notifications"
    id = db.Column(db.String(36), primary_key=True, default=uid)
    tenant_id = db.Column(db.String(36), db.ForeignKey("tenants.id"), nullable=False, index=True)
    school_id = db.Column(db.String(36), db.ForeignKey("schools.id"), nullable=True, index=True)
    recipient_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    actor_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=True)
    kind = db.Column(db.String(48), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    body = db.Column(db.String(1000), nullable=False)
    target_path = db.Column(db.String(255), nullable=False, default="")
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    read_at = db.Column(db.DateTime(timezone=True), nullable=True)
    __table_args__ = (db.Index("ix_notifications_inbox", "tenant_id", "recipient_id", "created_at"),)

class WebPushSubscription(db.Model):
    __tablename__ = "web_push_subscriptions"
    id = db.Column(db.String(36), primary_key=True, default=uid)
    tenant_id = db.Column(db.String(36), db.ForeignKey("tenants.id"), nullable=False, index=True)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    endpoint = db.Column(db.String(2048), nullable=False, unique=True)
    p256dh = db.Column(db.String(256), nullable=False)
    auth = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    last_seen_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    __table_args__ = (db.Index("ix_web_push_user", "tenant_id", "user_id"),)

class PushOutbox(db.Model):
    """Durable push work created in the same transaction as each inbox notice."""
    __tablename__ = "push_outbox"
    id = db.Column(db.String(36), primary_key=True, default=uid)
    notification_id = db.Column(db.String(36), db.ForeignKey("notifications.id", ondelete="CASCADE"), nullable=False, unique=True)
    tenant_id = db.Column(db.String(36), db.ForeignKey("tenants.id"), nullable=False, index=True)
    recipient_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    attempts = db.Column(db.Integer, nullable=False, default=0)
    available_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), index=True)
    completed_at = db.Column(db.DateTime(timezone=True), nullable=True)
    failed_at = db.Column(db.DateTime(timezone=True), nullable=True)
    last_error = db.Column(db.String(500), nullable=True)
    __table_args__ = (db.Index("ix_push_outbox_ready", "completed_at", "failed_at", "available_at"),)

class Homework(db.Model):
    __tablename__ = "homework"
    id = db.Column(db.String(36), primary_key=True, default=uid)
    tenant_id = db.Column(db.String(36), db.ForeignKey("tenants.id"), nullable=False, index=True)
    school_id = db.Column(db.String(36), db.ForeignKey("schools.id"), nullable=False, index=True)
    assignment_id = db.Column(db.String(36), db.ForeignKey("teaching_assignments.id"), nullable=False, index=True)
    created_by = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False, default="")
    due_at = db.Column(db.DateTime(timezone=True), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
