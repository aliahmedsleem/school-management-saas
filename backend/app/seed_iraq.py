from . import db
from .models import EducationSystem

def seed_iraq():
    if not EducationSystem.query.filter_by(code="IQ-NATIONAL").first():
        db.session.add(EducationSystem(country_code="IQ", code="IQ-NATIONAL", name="Iraqi National Curriculum"))
        db.session.commit()
