"""API route blueprints."""

from app.routes.auth import auth_bp
from app.routes.dashboard import dashboard_bp
from app.routes.upload import upload_bp
from app.routes.seating import seating_bp
from app.routes.export import export_bp

__all__ = ['auth_bp', 'dashboard_bp', 'upload_bp', 'seating_bp', 'export_bp']
