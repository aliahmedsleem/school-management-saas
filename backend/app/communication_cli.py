"""Safe, additive bootstrap for the new notification/homework tables.

This command creates only missing tables from SQLAlchemy metadata; it does not
alter or drop existing tables. Full schema versioning remains a separate task.
"""
import click
from flask.cli import with_appcontext
from sqlalchemy import inspect
from . import db
from .notification_models import Notification, Homework

@click.command("init-communication-tables")
@with_appcontext
def init_communication_tables():
    engine=db.engine
    tables=[Notification.__table__, Homework.__table__]
    existing=set(inspect(engine).get_table_names())
    pending=[table for table in tables if table.name not in existing]
    if pending:
        db.metadata.create_all(bind=engine, tables=pending, checkfirst=True)
    click.echo("Communication tables ready: "+", ".join(table.name for table in tables))
