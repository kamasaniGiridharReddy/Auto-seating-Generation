"""Flask application factory without database."""

import os
from flask import Flask, send_from_directory
from app.config import config
from app.extensions import cors


def create_app(config_name=None):
    """Create and configure the Flask application."""
    if config_name is None:
        config_name = 'default'

    # Debug: Print configuration selection
    print(f"[APP DEBUG] FLASK_ENV: {os.getenv('FLASK_ENV', 'NOT SET')}")
    print(f"[APP DEBUG] Config name requested: {config_name}")
    print(f"[APP DEBUG] Selected config class: {config[config_name].__name__}")

    # Configure Flask to serve React frontend
    static_folder = os.path.join(os.path.dirname(__file__), 'static')
    template_folder = os.path.join(os.path.dirname(__file__), 'static')
    
    app = Flask(
        __name__,
        static_folder=static_folder,
        template_folder=template_folder
    )
    app.config.from_object(config[config_name])

    # Initialize extensions
    # CORS not needed for same-domain deployment (React served by Flask)
    # Keeping for API flexibility if needed in future
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})

    # Register blueprints
    from app.routes import dashboard_bp, export_bp, seating_bp, upload_bp
    
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(export_bp)
    app.register_blueprint(seating_bp)
    app.register_blueprint(upload_bp)

    @app.route('/health')
    def health():
        """Health check endpoint."""
        return {'status': 'healthy'}

    # Catch-all route to serve React app for non-API routes
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_react(path):
        """Serve React frontend."""
        if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        return send_from_directory(app.static_folder, 'index.html')

    return app
