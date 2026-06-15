"""Student model (from CSV: ID, Name, Skill, Classroom)."""

from app.extensions import db


class Student(db.Model):
    """Student model with Booking ID support."""
    __tablename__ = "students"

    id = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(db.String(100), nullable=True, index=True)  # Booking ID from CSV
    student_uid = db.Column(db.String(100), nullable=False, index=True)  # Student UID from CSV
    student_name = db.Column(db.String(255), nullable=False)
    niat_id = db.Column(db.String(100), nullable=True)
    campus = db.Column(db.String(100), nullable=True)
    slot_centre = db.Column(db.String(100), nullable=True)
    batch = db.Column(db.String(100), nullable=True)
    section = db.Column(db.String(100), nullable=True)
    contest_date = db.Column(db.String(50), nullable=True)
    time_slot = db.Column(db.String(50), nullable=True)
    skill = db.Column(db.String(100), nullable=True)
    skill_level = db.Column(db.String(50), nullable=True)

    # Seating assignment fields
    classroom_id = db.Column(db.Integer, db.ForeignKey('classrooms.id'), nullable=True)
    bench_id = db.Column(db.Integer, db.ForeignKey('benches.id'), nullable=True)
    seat_position = db.Column(db.Integer, nullable=True)  # position on bench (1/2/3)

    def to_dict(self):
        """Convert student to dictionary."""
        return {
            'id': self.id,
            'booking_id': self.booking_id or 'N/A',
            'student_uid': self.student_uid,
            'student_name': self.student_name,
            'niat_id': self.niat_id,
            'campus': self.campus,
            'slot_centre': self.slot_centre,
            'batch': self.batch,
            'section': self.section,
            'contest_date': self.contest_date,
            'time_slot': self.time_slot,
            'skill': self.skill,
            'skill_level': self.skill_level,
            'classroom_id': self.classroom_id,
            'bench_id': self.bench_id,
            'seat_position': self.seat_position,
        }
