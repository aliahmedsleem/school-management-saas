from functools import wraps
from flask import jsonify, session, g
from sqlalchemy import select
from . import db
from .models import Membership, User

def require_membership(*roles):
    def decorate(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user_id = session.get("user_id")
            tenant_id = session.get("tenant_id")
            if not user_id or not tenant_id:
                return jsonify(error="authentication_required"), 401
            user = db.session.get(User, user_id)
            memberships = db.session.scalars(select(Membership).where(
                Membership.user_id == user_id, Membership.tenant_id == tenant_id
            )).all()
            if not user or not user.is_active or not memberships:
                return jsonify(error="forbidden"), 403
            # A tenant-wide membership must be explicit. Never use an arbitrary
            # school-scoped membership to authorize access to the entire tenant.
            eligible = [m for m in memberships if not roles or m.role in roles]
            if not eligible:
                return jsonify(error="forbidden"), 403
            selected_id = session.get("membership_id")
            selected = next((m for m in eligible if m.id == selected_id), None)
            if selected_id and selected is None:
                return jsonify(error="forbidden"), 403
            if selected:
                membership = selected
            elif selected_id:
                return jsonify(error="forbidden"), 403
            elif len(memberships) != 1:
                # Never infer a privileged role from an unrelated membership.
                return jsonify(error="membership_selection_required"), 403
            else:
                membership = eligible[0]
            g.tenant_id = tenant_id
            g.user_id = user_id
            g.membership = membership
            return fn(*args, **kwargs)
        return wrapper
    return decorate
