"""Dashboard routes. TODO: implement."""

from flask import Blueprint

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")

@dashboard_bp.route("/stats", methods=["GET"])
def get_stats():
    """Return classroom count, total benches, students per bench config."""
    pass

@dashboard_bp.route("/classrooms", methods=["GET", "POST", "PUT", "DELETE"])
def manage_classrooms():
    """CRUD for classrooms and bench numbering."""
    pass
