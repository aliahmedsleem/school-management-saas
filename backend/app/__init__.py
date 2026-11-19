import os
import hmac
from flask import Flask, jsonify, request, session, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

db = SQLAlchemy()
migrate = Migrate()

def create_app(test_config=None):
    app = Flask(__name__)
    app.config.update(
        SQLALCHEMY_DATABASE_URI=os.getenv("DATABASE_URL", "sqlite:///dev.db"),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        SECRET_KEY=os.getenv("SECRET_KEY", "development-only-change-me"),
        ENVIRONMENT=os.getenv("ENVIRONMENT", "development"),
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        SESSION_COOKIE_SECURE=os.getenv("COOKIE_SECURE", "false").lower() == "true",
    )
    if test_config:
        app.config.update(test_config)
    if app.config["ENVIRONMENT"] != "development" and app.config["SECRET_KEY"] == "development-only-change-me":
        raise RuntimeError("Configure SECRET_KEY before production deployment.")
    db.init_app(app)
    migrate.init_app(app, db)
    from . import models
    from . import notification_models
    from .api import api
    from .academics import academics
    from .portals import portals
    from .attendance import attendance
    from .learning import learning
    from .notifications import notifications
    from .homework import homework
    from .cli import bootstrap_demo, bootstrap_staging, create_staging_owner
    from .communication_cli import init_communication_tables
    app.register_blueprint(api)
    app.register_blueprint(academics)
    app.register_blueprint(portals)
    app.register_blueprint(attendance)
    app.register_blueprint(learning)
    app.register_blueprint(notifications)
    app.register_blueprint(homework)
    app.cli.add_command(bootstrap_demo)
    app.cli.add_command(bootstrap_staging)
    app.cli.add_command(create_staging_owner)
    app.cli.add_command(init_communication_tables)

    @app.before_request
    def csrf_protection():
        if request.method in ("POST", "PUT", "PATCH", "DELETE") and request.path != "/api/auth/login" and session.get("user_id"):
            expected = session.get("csrf_token", "")
            supplied = request.headers.get("X-CSRF-Token", "")
            if not expected or not hmac.compare_digest(expected, supplied):
                return jsonify(error="csrf_required"), 403

    @app.get("/")
    @app.get("/<path:asset_path>")
    def frontend(asset_path=""):
        from pathlib import Path
        directory = Path(app.root_path).parent / "static_frontend"
        if not directory.is_dir():
            return jsonify(error="frontend_not_built"), 404
        if asset_path and (directory / asset_path).is_file():
            return send_from_directory(str(directory), asset_path)
        if asset_path.startswith("api/"):
            return jsonify(error="not_found"), 404
        return send_from_directory(str(directory), "index.html")

    @app.get("/api/health")
    def health():
        return jsonify(status="ok")
    return app
