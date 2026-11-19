import click
from flask.cli import with_appcontext
from werkzeug.security import generate_password_hash
from . import db
from .models import Tenant, User, Membership, School, EducationSystem

@click.command("bootstrap-demo")
@click.option("--email", required=True)
@click.option("--password", prompt=True, hide_input=True, confirmation_prompt=True)
@with_appcontext
def bootstrap_demo(email, password):
    """Create a local demo tenant and owner. Never run on a production database."""
    from flask import current_app
    if current_app.config.get("ENVIRONMENT") != "development":
        raise click.ClickException("Set ENVIRONMENT=development to enable demo bootstrap.")
    if len(password) < 12:
        raise click.ClickException("Password must be at least 12 characters.")
    if User.query.filter_by(email=email.strip().lower()).first():
        raise click.ClickException("User already exists.")
    tenant = Tenant(name="مدرسة المستقبل - تجربة")
    user = User(email=email.strip().lower(), password_hash=generate_password_hash(password))
    db.session.add_all([tenant, user])
    db.session.flush()
    db.session.add_all([
        School(tenant_id=tenant.id, name="مدرسة المستقبل", country_code="IQ"),
        Membership(tenant_id=tenant.id, user_id=user.id, role="owner"),
    ])
    if not EducationSystem.query.filter_by(code="IQ-NATIONAL").first():
        db.session.add(EducationSystem(country_code="IQ", code="IQ-NATIONAL", name="Iraqi National Curriculum"))
    db.session.commit()
    click.echo(f"Demo tenant ID: {tenant.id}")

@click.command("bootstrap-staging")
@click.option("--email", required=True, help="Unique administrator email")
@click.option("--school", default="مدرسة تجريبية", show_default=True)
@click.option("--password", prompt=True, hide_input=True, confirmation_prompt=True)
@with_appcontext
def bootstrap_staging(email, school, password):
    """One-time staging owner; never enabled in production."""
    from flask import current_app
    if current_app.config.get("ENVIRONMENT") != "staging":
        raise click.ClickException("Only available in staging.")
    if len(password) < 12 or len(password) > 128:
        raise click.ClickException("Password must be 12-128 characters.")
    email = email.strip().lower()
    if "@" not in email or len(email) > 320:
        raise click.ClickException("Invalid email.")
    if User.query.filter_by(email=email).first():
        raise click.ClickException("Email already exists; refusing to overwrite credentials.")
    if Tenant.query.first():
        raise click.ClickException("Staging already contains a tenant. Refusing automatic bootstrap.")
    tenant = Tenant(name="SchoolCloud staging")
    user = User(email=email, password_hash=generate_password_hash(password))
    db.session.add_all([tenant, user])
    db.session.flush()
    school_record = School(tenant_id=tenant.id, name=school.strip()[:200], country_code="IQ")
    db.session.add_all([school_record, Membership(tenant_id=tenant.id, user_id=user.id, role="owner")])
    db.session.commit()
    click.echo(f"Staging tenant ID: {tenant.id}")
    click.echo(f"Staging school ID: {school_record.id}")
