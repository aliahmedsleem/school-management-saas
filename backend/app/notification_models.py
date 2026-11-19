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
