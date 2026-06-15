"""Bench model with numbering."""

from app.extensions import db


class Bench(db.Model):
    """Bench model with row and column positioning."""
    __tablename__ = "benches"

    id = db.Column(db.Integer, primary_key=True)
    classroom_id = db.Column(db.Integer, db.ForeignKey('classrooms.id'), nullable=False)
    bench_number = db.Column(db.Integer, nullable=False)
    row = db.Column(db.Integer, nullable=False)  # Row number in classroom
    col = db.Column(db.Integer, nullable=False)  # Column number in classroom

    # Relationships
    students = db.relationship('Student', backref='bench', lazy=True)

    def to_dict(self):
        """Convert bench to dictionary."""
        return {
            'id': self.id,
            'classroom_id': self.classroom_id,
            'bench_number': self.bench_number,
            'row': self.row,
            'col': self.col,
        }
