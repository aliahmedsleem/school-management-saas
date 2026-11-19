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
            tenant_wide = next((m for m in eligible if m.school_id is None), None)
            if tenant_wide:
                membership = tenant_wide
            else:
                # No active school-selection mechanism exists yet: fail closed.
                school_ids = {m.school_id for m in eligible}
                if len(school_ids) != 1:
                    return jsonify(error="school_selection_required"), 403
                membership = eligible[0]
            g.tenant_id = tenant_id
            g.user_id = user_id
            g.membership = membership
            return fn(*args, **kwargs)
        return wrapper
    return decorate
