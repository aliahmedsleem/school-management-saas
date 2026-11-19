from flask import Blueprint, jsonify, request, session, g
from sqlalchemy import select
from werkzeug.security import check_password_hash
from . import db
from .models import User, Membership, School, Tenant, Subscription
from .security import require_membership

api = Blueprint("api", __name__, url_prefix="/api")

@api.post("/auth/login")
def login():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    password = data.get("password", "")
    tenant_id = data.get("tenant_id")
    if not email or not password or not tenant_id:
        return jsonify(error="missing_credentials"), 400
    user = db.session.scalar(select(User).where(User.email == email))
    if not user or not user.is_active or not check_password_hash(user.password_hash, password):
        return jsonify(error="invalid_credentials"), 401
    memberships = db.session.scalars(select(Membership).where(
        Membership.user_id == user.id, Membership.tenant_id == tenant_id
    )).all()
    if not memberships:
        return jsonify(error="invalid_credentials"), 401
    membership = next((m for m in memberships if m.school_id is None), memberships[0])
    session.clear()
    if len(memberships) == 1:
        session["membership_id"] = memberships[0].id
    session["user_id"] = user.id
    session["tenant_id"] = tenant_id
    session["csrf_token"] = __import__("secrets").token_urlsafe(32)
    return jsonify(user={"id": user.id, "email": user.email}, role=membership.role, tenant_id=tenant_id, csrf_token=session["csrf_token"], memberships=[{"id": m.id, "role": m.role, "school_id": m.school_id} for m in memberships])

@api.post("/auth/logout")
def logout():
    session.clear()
    return jsonify(ok=True)

@api.get("/auth/me")
@require_membership()
def me():
    user = db.session.get(User, g.user_id)
    return jsonify(user={"id": user.id, "email": user.email}, tenant_id=g.tenant_id, role=g.membership.role, csrf_token=session.get("csrf_token"), memberships=[{"id":m.id,"role":m.role,"school_id":m.school_id} for m in db.session.scalars(select(Membership).where(Membership.user_id==g.user_id,Membership.tenant_id==g.tenant_id)).all()])

@api.get("/schools")
@require_membership("owner", "principal", "registrar")
def list_schools():
    schools = db.session.scalars(select(School).where(School.tenant_id == g.tenant_id, *([School.id == g.membership.school_id] if g.membership.school_id else [])).order_by(School.name)).all()
    return jsonify(items=[{"id": s.id, "name": s.name, "country_code": s.country_code, "timezone": s.timezone} for s in schools])

@api.post("/schools")
@require_membership("owner")
def create_school():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    if not 1 <= len(name) <= 200:
        return jsonify(error="invalid_school_name"), 400
    if g.membership.school_id:
        return jsonify(error="forbidden"), 403
    school = School(tenant_id=g.tenant_id, name=name, country_code="IQ", timezone="Asia/Baghdad")
    db.session.add(school)
    db.session.commit()
    return jsonify(id=school.id, name=school.name), 201

@api.get("/subscription")
@require_membership("owner", "principal")
def subscription():
    record = db.session.scalar(select(Subscription).where(Subscription.tenant_id == g.tenant_id).order_by(Subscription.starts_at.desc()))
    return jsonify(subscription=None if record is None else {"id": record.id, "status": record.status, "plan_id": record.plan_id})

@api.get("/auth/pending")
def pending_membership():
    """Restore the membership picker without granting any role permissions."""
    user_id, tenant_id = session.get("user_id"), session.get("tenant_id")
    if not user_id or not tenant_id:
        return jsonify(error="authentication_required"), 401
    user = db.session.get(User, user_id)
    if not user or not user.is_active:
        return jsonify(error="forbidden"), 403
    memberships = db.session.scalars(select(Membership).where(
        Membership.user_id == user_id, Membership.tenant_id == tenant_id
    )).all()
    if not memberships:
        return jsonify(error="forbidden"), 403
    return jsonify(user={"id":user.id,"email":user.email},tenant_id=tenant_id,
                   memberships=[{"id":m.id,"role":m.role,"school_id":m.school_id} for m in memberships],
                   selection_required=len(memberships)>1 and not session.get("membership_id"),
                   csrf_token=session.get("csrf_token"))
