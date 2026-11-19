from functools import wraps
from flask import jsonify, session, g
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
            membership = db.session.query(Membership).filter_by(user_id=user_id, tenant_id=tenant_id).first()
            user = db.session.get(User, user_id)
            if not user or not user.is_active or not membership or (roles and membership.role not in roles):
                return jsonify(error="forbidden"), 403
            g.tenant_id = tenant_id
            g.user_id = user_id
            g.membership = membership
            return fn(*args, **kwargs)
        return wrapper
    return decorate
