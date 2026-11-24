from datetime import datetime, timezone
from urllib.parse import urlsplit
from flask import Blueprint, current_app, jsonify, g, request
from sqlalchemy import select, func, or_
from . import db
from .models import User, Membership, School
from .notification_models import Notification, PushOutbox, WebPushSubscription
from .security import require_membership

notifications = Blueprint("notifications", __name__, url_prefix="/api/notifications")

def serialize(n):
    return dict(id=n.id,kind=n.kind,title=n.title,body=n.body,target_path=n.target_path,
                created_at=n.created_at.isoformat(),read_at=n.read_at.isoformat() if n.read_at else None)

def enqueue(tenant_id, recipient_ids, kind, title, body, school_id=None, actor_id=None, target_path=""):
    """Queue notifications in the caller's current transaction. Do not commit here."""
    ids=set(recipient_ids)
    if not ids:return 0
    if school_id and not db.session.scalar(select(School.id).where(
        School.id==school_id, School.tenant_id==tenant_id)):
        raise ValueError("school_outside_tenant")
    valid=set(db.session.scalars(select(User.id).join(Membership, Membership.user_id==User.id).where(
        User.id.in_(ids), User.is_active.is_(True), Membership.tenant_id==tenant_id,
        *([or_(Membership.school_id==school_id, Membership.school_id.is_(None))] if school_id else [])
    )).all())
    for user_id in valid:
        notice = Notification(tenant_id=tenant_id,school_id=school_id,recipient_id=user_id,
                              actor_id=actor_id,kind=kind,title=title[:200],body=body[:1000],
                              target_path=target_path[:255])
        db.session.add(notice)
        if (current_app.config.get("VAPID_PUBLIC_KEY") and current_app.config.get("VAPID_PRIVATE_KEY")
                and current_app.config.get("VAPID_CLAIMS_SUB")):
            db.session.flush()
            db.session.add(PushOutbox(notification_id=notice.id, tenant_id=tenant_id, recipient_id=user_id))
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

@notifications.get("/push-config")
@require_membership()
def push_config():
    enabled = bool(current_app.config.get("VAPID_PUBLIC_KEY") and current_app.config.get("VAPID_PRIVATE_KEY")
                   and current_app.config.get("VAPID_CLAIMS_SUB"))
    return jsonify(enabled=enabled, public_key=current_app.config.get("VAPID_PUBLIC_KEY") if enabled else None)

@notifications.get("/subscriptions")
@require_membership()
def list_push_subscriptions():
    rows = db.session.scalars(select(WebPushSubscription).where(
        WebPushSubscription.tenant_id == g.tenant_id, WebPushSubscription.user_id == g.user_id,
    ).order_by(WebPushSubscription.created_at.desc())).all()
    return jsonify(items=[{"id": row.id} for row in rows])

@notifications.post("/subscriptions")
@require_membership()
def save_push_subscription():
    if not (current_app.config.get("VAPID_PUBLIC_KEY") and current_app.config.get("VAPID_PRIVATE_KEY")
            and current_app.config.get("VAPID_CLAIMS_SUB")):
        return jsonify(error="push_not_configured"), 503
    data = request.get_json(silent=True) or {}
    endpoint = str(data.get("endpoint", "")).strip()
    keys = data.get("keys") if isinstance(data.get("keys"), dict) else {}
    p256dh, auth = str(keys.get("p256dh", "")), str(keys.get("auth", ""))
    try:
        parsed = urlsplit(endpoint)
        host = (parsed.hostname or "").lower()
        port = parsed.port
    except ValueError:
        return jsonify(error="invalid_subscription"), 400
    supported_host = (host == "fcm.googleapis.com" or host.endswith(".push.services.mozilla.com")
                      or host == "web.push.apple.com")
    if (len(endpoint) > 2048 or parsed.scheme != "https" or not supported_host or port not in (None, 443)
            or parsed.username or parsed.password or parsed.fragment or len(p256dh) not in range(20, 257)
            or len(auth) not in range(16, 257)):
        return jsonify(error="invalid_subscription"), 400
    existing = db.session.scalar(select(WebPushSubscription).where(WebPushSubscription.endpoint == endpoint))
    now = datetime.now(timezone.utc)
    created = existing is None
    if existing:
        # A browser endpoint is one device. Rebind it after a new account signs
        # in on the same device so alerts never continue to the previous user.
        existing.tenant_id, existing.user_id = g.tenant_id, g.user_id
        existing.p256dh, existing.auth, existing.last_seen_at = p256dh, auth, now
        subscription = existing
    else:
        subscription = WebPushSubscription(tenant_id=g.tenant_id, user_id=g.user_id,
            endpoint=endpoint, p256dh=p256dh, auth=auth, last_seen_at=now)
        db.session.add(subscription)
    db.session.commit()
    return jsonify(id=subscription.id, enabled=True), 201 if created else 200

@notifications.delete("/subscriptions/<subscription_id>")
@require_membership()
def remove_push_subscription(subscription_id):
    subscription = db.session.scalar(select(WebPushSubscription).where(
        WebPushSubscription.id == subscription_id, WebPushSubscription.tenant_id == g.tenant_id,
        WebPushSubscription.user_id == g.user_id,
    ))
    if subscription:
        db.session.delete(subscription)
        db.session.commit()
    return jsonify(ok=True)

@notifications.delete("/subscriptions/current")
@require_membership()
def remove_current_push_subscription():
    data = request.get_json(silent=True) or {}
    endpoint = str(data.get("endpoint", "")).strip()
    if not endpoint or len(endpoint) > 2048:
        return jsonify(error="invalid_subscription"), 400
    subscription = db.session.scalar(select(WebPushSubscription).where(
        WebPushSubscription.endpoint == endpoint, WebPushSubscription.tenant_id == g.tenant_id,
        WebPushSubscription.user_id == g.user_id,
    ))
    if subscription:
        db.session.delete(subscription)
        db.session.commit()
    return jsonify(ok=True)
