"""Safe, additive bootstrap for the new notification/homework tables.

This command creates only missing tables from SQLAlchemy metadata; it does not
alter or drop existing tables. Full schema versioning remains a separate task.
"""
import click
from flask.cli import with_appcontext
from sqlalchemy import inspect
from . import db
from .notification_models import Notification, Homework, WebPushSubscription, PushOutbox

@click.command("init-communication-tables")
@with_appcontext
def init_communication_tables():
    engine=db.engine
    tables=[Notification.__table__, Homework.__table__, WebPushSubscription.__table__, PushOutbox.__table__]
    existing=set(inspect(engine).get_table_names())
    pending=[table for table in tables if table.name not in existing]
    if pending:
        db.metadata.create_all(bind=engine, tables=pending, checkfirst=True)
    click.echo("Communication tables ready: "+", ".join(table.name for table in tables))


@click.command("deliver-push-notifications")
@click.option("--limit", type=click.IntRange(1, 500), default=50, show_default=True)
@with_appcontext
def deliver_push_notifications(limit):
    """Deliver pending web-push messages; schedule this command once per minute."""
    from datetime import datetime, timedelta, timezone
    import json
    from flask import current_app
    from sqlalchemy import select
    from .notification_models import Notification, PushOutbox, WebPushSubscription

    public_key = current_app.config.get("VAPID_PUBLIC_KEY")
    private_key = current_app.config.get("VAPID_PRIVATE_KEY")
    claims_sub = current_app.config.get("VAPID_CLAIMS_SUB")
    if not (public_key and private_key and claims_sub):
        click.echo("Web Push is disabled: configure VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_CLAIMS_SUB.")
        return

    from pywebpush import WebPushException, webpush
    now = datetime.now(timezone.utc)
    queue = db.session.scalars(select(PushOutbox).where(
        PushOutbox.completed_at.is_(None), PushOutbox.failed_at.is_(None),
        PushOutbox.available_at <= now,
    ).order_by(PushOutbox.available_at, PushOutbox.id).limit(limit)).all()
    delivered = expired = retried = 0
    for job in queue:
        notice = db.session.get(Notification, job.notification_id)
        subscriptions = db.session.scalars(select(WebPushSubscription).where(
            WebPushSubscription.tenant_id == job.tenant_id,
            WebPushSubscription.user_id == job.recipient_id,
        )).all()
        payload = json.dumps({
            "title": notice.title if notice else "SchoolCloud",
            "body": notice.body if notice else "لديك إشعار جديد.",
            "url": notice.target_path if notice and notice.target_path.startswith("/") and not notice.target_path.startswith("//") else "/",
            "tag": notice.id if notice else job.notification_id,
        }, ensure_ascii=False)
        had_error = False
        for subscription in subscriptions:
            try:
                webpush(
                    subscription_info={"endpoint": subscription.endpoint,
                        "keys": {"p256dh": subscription.p256dh, "auth": subscription.auth}},
                    data=payload, vapid_private_key=private_key,
                    vapid_claims={"sub": claims_sub}, ttl=60,
                )
            except WebPushException as exc:
                status = getattr(getattr(exc, "response", None), "status_code", None)
                if status in (404, 410):
                    db.session.delete(subscription)
                    expired += 1
                else:
                    had_error = True
                    job.last_error = f"push_delivery_failed:{status or 'unknown'}"[:500]
            except Exception as exc:
                had_error = True
                job.last_error = f"push_delivery_failed:{type(exc).__name__}"[:500]
        job.attempts += 1
        if not had_error:
            job.completed_at = datetime.now(timezone.utc)
            job.last_error = None
            delivered += 1
        elif job.attempts >= 8:
            job.failed_at = datetime.now(timezone.utc)
        else:
            job.available_at = datetime.now(timezone.utc) + timedelta(seconds=min(3600, 15 * (2 ** (job.attempts - 1))))
            retried += 1
        db.session.commit()
    click.echo(f"Push outbox: delivered={delivered}, expired_subscriptions={expired}, retry_scheduled={retried}")
