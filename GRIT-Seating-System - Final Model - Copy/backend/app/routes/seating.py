"""Seating arrangement routes. TODO: implement."""

# from flask import Blueprint
#
# seating_bp = Blueprint("seating", __name__, url_prefix="/api/seating")
#
# Seating rules:
#   No two students with the same skill may sit:
#   - beside (adjacent on same bench or neighboring bench)
#   - in front (row above)
#   - in back (row below)
#
# @seating_bp.route("/generate", methods=["POST"])
# def generate_seating():
#     """Run seating algorithm for a classroom."""
#     pass
#
# @seating_bp.route("/<classroom_id>", methods=["GET"])
# def get_seating(classroom_id):
#     """Return current seating layout."""
#     pass
