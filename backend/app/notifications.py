from datetime import datetime, timezone
from flask import Blueprint, jsonify, g
from sqlalchemy import select, func
from . import db
from .models import User, Membership
from .notification_models import Notification
from .security import require_membership

notifications = Blueprint("notifications", __name__, url_prefix="/api/notifications")

def serialize(n):
    return dict(id=n.id,kind=n.kind,title=n.title,body=n.body,target_path=n.target_path,
                created_at=n.created_at.isoformat(),read_at=n.read_at.isoformat() if n.read_at else None)

def enqueue(tenant_id, recipient_ids, kind, title, body, school_id=None, actor_id=None, target_path=""):
    """Queue notifications in the caller's current transaction. Do not commit here."""
    ids=set(recipient_ids)
    if not ids:return 0
    valid=set(db.session.scalars(select(User.id).join(Membership, Membership.user_id==User.id).where(
        User.id.in_(ids), User.is_active.is_(True), Membership.tenant_id==tenant_id,
        *([Membership.school_id==school_id] if school_id else [])
    )).all())
    for user_id in valid:
        db.session.add(Notification(tenant_id=tenant_id,school_id=school_id,recipient_id=user_id,
                                    actor_id=actor_id,kind=kind,title=title[:200],body=body[:1000],
                                    target_path=target_path[:255]))
    return len(valid)

@notifications.get("")
@require_membership()
def inbox():
    rows=db.session.scalars(select(Notification).where(
        Notification.tenant_id==g.tenant_id,Notification.recipient_id==g.user_id
    ).order_by(Notification.created_at.desc()).limit(100)).all()
    unread=db.session.scalar(select(func.count(Notification.id)).where(
        Notification.tenant_id==g.tenant_id,Notification.recipient_id==g.user_id,
        Notification.read_at.is_(None)))
    return jsonify(items=[serialize(n) for n in rows],unread=unread)

@notifications.post("/<notification_id>/read")
@require_membership()
def mark_read(notification_id):
    n=db.session.scalar(select(Notification).where(Notification.id==notification_id,
        Notification.tenant_id==g.tenant_id,Notification.recipient_id==g.user_id))
    if not n:return jsonify(error="not_found"),404
    if n.read_at is None:
        n.read_at=datetime.now(timezone.utc)
        db.session.commit()
    return jsonify(item=serialize(n))
