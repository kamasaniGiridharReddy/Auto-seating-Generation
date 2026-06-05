"""Flask application factory with MySQL support."""

import os
from flask import Flask
from app.config import config
from app.extensions import db, migrate, cors


def create_app(config_name=None):
    """Create and configure the Flask application."""
    if config_name is None:
        config_name = 'default'

    # Debug: Print configuration selection
    print(f"[APP DEBUG] FLASK_ENV: {os.getenv('FLASK_ENV', 'NOT SET')}")
    print(f"[APP DEBUG] Config name requested: {config_name}")
    print(f"[APP DEBUG] Selected config class: {config[config_name].__name__}")

    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # Debug: Print database URI (mask password)
    uri = app.config.get('SQLALCHEMY_DATABASE_URI', '')
    # Print the actual URI to see what's being used
    print(f"[APP DEBUG] Raw SQLALCHEMY_DATABASE_URI: {uri}")
    if '@' in uri:
        # Properly mask password in URI
        parts = uri.split('://')
        if len(parts) == 2:
            scheme = parts[0]
            rest = parts[1]
            auth_and_host = rest.split('@')
            if len(auth_and_host) == 2:
                auth = auth_and_host[0]
                host = auth_and_host[1]
                user = auth.split(':')[0] if ':' in auth else auth
                masked_uri = f"{scheme}://{user}:****@{host}"
            else:
                masked_uri = uri
        else:
            masked_uri = uri
    else:
        masked_uri = uri
    print(f"[APP DEBUG] Masked SQLALCHEMY_DATABASE_URI: {masked_uri}")

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    cors.init_app(app)

    # Register blueprints
    from app.routes import auth_bp, dashboard_bp, export_bp, seating_bp, upload_bp
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(export_bp)
    app.register_blueprint(seating_bp)
    app.register_blueprint(upload_bp)

    # Import models to ensure they're registered with SQLAlchemy
    from app.models import user, student, classroom, bench

    @app.route('/health')
    def health():
        """Health check endpoint."""
        return {'status': 'healthy', 'database': 'MySQL'}

    return app
