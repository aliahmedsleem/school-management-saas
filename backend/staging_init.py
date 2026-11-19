"""Initialize ONLY a disposable staging database, never a production migration."""
import os
from app import create_app, db

if os.environ.get("ENVIRONMENT") != "staging":
    raise SystemExit("Refusing to create schema outside staging.")
app = create_app()
with app.app_context():
    db.create_all()
    print("Staging schema initialized. Run bootstrap-demo explicitly for test users.")
