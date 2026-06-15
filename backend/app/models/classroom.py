"""Classroom model."""

from app.extensions import db


class Classroom(db.Model):
    """Classroom model for seating arrangements."""
    __tablename__ = "classrooms"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    bench_count = db.Column(db.Integer, nullable=False)
    students_per_bench = db.Column(db.Integer, nullable=False)  # 1, 2, or 3

    # Relationships
    benches = db.relationship('Bench', backref='classroom', lazy=True, cascade='all, delete-orphan')
    students = db.relationship('Student', backref='classroom', lazy=True)

    def to_dict(self):
        """Convert classroom to dictionary."""
        return {
            'id': self.id,
            'name': self.name,
            'bench_count': self.bench_count,
            'students_per_bench': self.students_per_bench,
        }
