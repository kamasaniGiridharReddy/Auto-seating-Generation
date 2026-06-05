# Flask SQLite to MySQL Migration Guide

This document explains the complete conversion of the Flask application from SQLite to MySQL.

## Files Modified

### 1. requirements.txt
**Purpose:** Added MySQL and migration dependencies

**Changes:**
- Added `flask-migrate>=4.0.0` for database migrations
- Added `pymysql>=1.1.0` for MySQL connectivity
- Added `cryptography>=41.0.0` required by PyMySQL

**Complete file:**
```
flask>=3.0.0
flask-cors>=4.0.0
flask-sqlalchemy>=3.1.0
flask-migrate>=4.0.0
pymysql>=1.1.0
cryptography>=41.0.0
python-dotenv>=1.0.0
werkzeug>=3.0.0
openpyxl>=3.1.0
pandas>=2.0.0
```

---

### 2. app/config.py
**Purpose:** Replaced SQLite configuration with MySQL using environment variables

**Changes:**
- Removed SQLite URI
- Added MySQL connection string using PyMySQL driver
- Added environment variable support for database credentials
- Created separate configs for Development, Production, and Testing

**Complete file:**
```python
"""Application configuration with MySQL support."""

import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Base configuration."""
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = os.getenv('SQLALCHEMY_ECHO', 'False').lower() == 'true'


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://"
        f"{os.getenv('DATABASE_USER', 'root')}:"
        f"{os.getenv('DATABASE_PASSWORD', '')}@"
        f"{os.getenv('DATABASE_HOST', 'localhost')}:"
        f"{os.getenv('DATABASE_PORT', '3306')}/"
        f"{os.getenv('DATABASE_NAME', 'grit_seating_dev')}"
    )


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://"
        f"{os.getenv('DATABASE_USER')}:"
        f"{os.getenv('DATABASE_PASSWORD')}@"
        f"{os.getenv('DATABASE_HOST')}:"
        f"{os.getenv('DATABASE_PORT', '3306')}/"
        f"{os.getenv('DATABASE_NAME')}"
    )


class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://"
        f"{os.getenv('DATABASE_USER', 'root')}:"
        f"{os.getenv('DATABASE_PASSWORD', '')}@"
        f"{os.getenv('DATABASE_HOST', 'localhost')}:"
        f"{os.getenv('DATABASE_PORT', '3306')}/"
        f"{os.getenv('DATABASE_NAME', 'grit_seating_test')}"
    )


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
```

---

### 3. app/extensions.py
**Purpose:** Initialize Flask extensions including SQLAlchemy, Migrate, and CORS

**Changes:**
- Uncommented and initialized SQLAlchemy
- Added Flask-Migrate for database migrations
- Added Flask-CORS for cross-origin requests

**Complete file:**
```python
"""Flask extensions initialization."""

from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS

db = SQLAlchemy()
migrate = Migrate()

cors = CORS()
```

---

### 4. app/models/user.py
**Purpose:** Created User model with password hashing

**Changes:**
- Implemented User model with id, name, email (unique), password_hash, is_admin, created_at, updated_at
- Added password hashing using werkzeug.security
- Added password verification method
- Added to_dict() method for JSON serialization

**Complete file:**
```python
"""User model for authentication with password hashing."""

from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from app.extensions import db


class User(db.Model):
    """User model for authentication."""
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    is_admin = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def set_password(self, password):
        """Hash and set the user's password."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Check if the provided password matches the stored hash."""
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        """Convert user object to dictionary (excluding password)."""
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'is_admin': self.is_admin,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f'<User {self.email}>'
```

---

### 5. app/__init__.py
**Purpose:** Implemented Flask app factory with MySQL support

**Changes:**
- Implemented create_app() function
- Initialized db, migrate, and cors extensions
- Registered all route blueprints
- Imported models for SQLAlchemy registration
- Added health check endpoint

**Complete file:**
```python
"""Flask application factory with MySQL support."""

from flask import Flask
from app.config import config
from app.extensions import db, migrate, cors


def create_app(config_name=None):
    """Create and configure the Flask application."""
    if config_name is None:
        config_name = 'default'

    app = Flask(__name__)
    app.config.from_object(config[config_name])

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
```

---

### 6. app/services/auth_service.py
**Purpose:** Implemented authentication service with user management

**Changes:**
- Implemented register_user() with password hashing
- Implemented authenticate_user() with password verification
- Implemented delete_user() with admin-only access
- Implemented list_users() with admin-only access
- Added get_user_by_id() helper function

**Complete file:**
```python
"""Authentication service for user management."""

from app.extensions import db
from app.models.user import User
from werkzeug.security import generate_password_hash, check_password_hash


def register_user(name, email, password, is_admin=False):
    """
    Register a new user.
    
    Args:
        name: User's full name
        email: User's email address (must be unique)
        password: User's password (will be hashed)
        is_admin: Whether the user has admin privileges (default: False)
    
    Returns:
        User object if successful, None if email already exists
    """
    # Check if user already exists
    if User.query.filter_by(email=email).first():
        return None
    
    user = User(name=name, email=email, is_admin=is_admin)
    user.set_password(password)
    
    db.session.add(user)
    db.session.commit()
    
    return user


def authenticate_user(email, password):
    """
    Authenticate a user with email and password.
    
    Args:
        email: User's email address
        password: User's password
    
    Returns:
        User object if authentication successful, None otherwise
    """
    user = User.query.filter_by(email=email).first()
    
    if user and user.check_password(password):
        return user
    
    return None


def delete_user(user_id, requesting_user):
    """
    Delete a user (admin only).
    
    Args:
        user_id: ID of the user to delete
        requesting_user: User making the request (must be admin)
    
    Returns:
        True if successful, False otherwise
    """
    if not requesting_user.is_admin:
        return False
    
    user = User.query.get(user_id)
    if not user:
        return False
    
    # Prevent admin from deleting themselves
    if user.id == requesting_user.id:
        return False
    
    db.session.delete(user)
    db.session.commit()
    
    return True


def list_users(requesting_user):
    """
    List all users (admin only).
    
    Args:
        requesting_user: User making the request (must be admin)
    
    Returns:
        List of user dictionaries if admin, None otherwise
    """
    if not requesting_user.is_admin:
        return None
    
    users = User.query.all()
    return [user.to_dict() for user in users]


def get_user_by_id(user_id):
    """
    Get a user by ID.
    
    Args:
        user_id: User's ID
    
    Returns:
        User object if found, None otherwise
    """
    return User.query.get(user_id)


def hash_password(password):
    """
    Hash a password (utility function).
    
    Args:
        password: Plain text password
    
    Returns:
        Hashed password
    """
    return generate_password_hash(password)
```

---

### 7. app/routes/auth.py
**Purpose:** Created authentication API endpoints

**Changes:**
- Implemented POST /api/auth/register for user registration
- Implemented POST /api/auth/login for user authentication
- Implemented GET /api/auth/users for listing users (admin only)
- Implemented DELETE /api/auth/users/<id> for deleting users (admin only)

**Complete file:**
```python
"""Authentication routes for user management."""

from flask import Blueprint, request, jsonify
from app.services.auth_service import (
    register_user,
    authenticate_user,
    delete_user,
    list_users
)

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/register", methods=["POST"])
def register():
    """
    Register a new user.
    
    Expected JSON payload:
    {
        "name": "John Doe",
        "email": "john@example.com",
        "password": "securepassword",
        "is_admin": false  // optional, defaults to false
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        name = data.get("name")
        email = data.get("email")
        password = data.get("password")
        is_admin = data.get("is_admin", False)
        
        # Validation
        if not name or not email or not password:
            return jsonify({"error": "Name, email, and password are required"}), 400
        
        if len(password) < 6:
            return jsonify({"error": "Password must be at least 6 characters"}), 400
        
        # Register user
        user = register_user(name, email, password, is_admin)
        
        if user is None:
            return jsonify({"error": "Email already registered"}), 409
        
        return jsonify({
            "message": "User registered successfully",
            "user": user.to_dict()
        }), 201
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@auth_bp.route("/login", methods=["POST"])
def login():
    """
    Authenticate user and return user data.
    
    Expected JSON payload:
    {
        "email": "john@example.com",
        "password": "securepassword"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        email = data.get("email")
        password = data.get("password")
        
        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400
        
        # Authenticate user
        user = authenticate_user(email, password)
        
        if user is None:
            return jsonify({"error": "Invalid email or password"}), 401
        
        return jsonify({
            "message": "Login successful",
            "user": user.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@auth_bp.route("/users", methods=["GET"])
def get_users():
    """
    List all users (admin only).
    
    Headers:
        X-User-ID: ID of the requesting user
    """
    try:
        # Get requesting user ID from header
        user_id = request.headers.get("X-User-ID")
        
        if not user_id:
            return jsonify({"error": "X-User-ID header required"}), 401
        
        from app.services.auth_service import get_user_by_id
        requesting_user = get_user_by_id(int(user_id))
        
        if not requesting_user:
            return jsonify({"error": "Invalid user ID"}), 401
        
        # List users (admin only)
        users = list_users(requesting_user)
        
        if users is None:
            return jsonify({"error": "Admin access required"}), 403
        
        return jsonify({
            "users": users,
            "count": len(users)
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@auth_bp.route("/users/<int:user_id>", methods=["DELETE"])
def delete_user_route(user_id):
    """
    Delete a user (admin only).
    
    Headers:
        X-User-ID: ID of the requesting user
    """
    try:
        # Get requesting user ID from header
        requesting_user_id = request.headers.get("X-User-ID")
        
        if not requesting_user_id:
            return jsonify({"error": "X-User-ID header required"}), 401
        
        from app.services.auth_service import get_user_by_id
        requesting_user = get_user_by_id(int(requesting_user_id))
        
        if not requesting_user:
            return jsonify({"error": "Invalid user ID"}), 401
        
        # Delete user (admin only)
        success = delete_user(user_id, requesting_user)
        
        if not success:
            return jsonify({"error": "Failed to delete user"}), 400
        
        return jsonify({"message": "User deleted successfully"}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
```

---

### 8. app/routes/__init__.py
**Purpose:** Export all route blueprints

**Changes:**
- Uncommented all blueprint imports
- Added __all__ for explicit exports

**Complete file:**
```python
"""API route blueprints."""

from app.routes.auth import auth_bp
from app.routes.dashboard import dashboard_bp
from app.routes.upload import upload_bp
from app.routes.seating import seating_bp
from app.routes.export import export_bp

__all__ = ['auth_bp', 'dashboard_bp', 'upload_bp', 'seating_bp', 'export_bp']
```

---

### 9. app/routes/dashboard.py, upload.py, seating.py, export.py
**Purpose:** Created blueprint placeholders for existing functionality

**Changes:**
- Uncommented Blueprint creation
- Kept route implementations as TODO (unchanged)

These files maintain the existing seating arrangement functionality structure.

---

### 10. app/models/__init__.py
**Purpose:** Export User model for SQLAlchemy registration

**Changes:**
- Uncommented User import
- Added __all__ for explicit exports
- Kept other models as TODO (unchanged)

**Complete file:**
```python
"""SQLAlchemy models package."""

from app.models.user import User
# from app.models.classroom import Classroom
# from app.models.bench import Bench
# from app.models.student import Student

__all__ = ['User']
```

---

### 11. .env.example
**Purpose:** Updated environment variables template with MySQL configuration

**Changes:**
- Removed SQLite DATABASE_URL
- Added MySQL-specific environment variables
- Added SQLALCHEMY_ECHO option

**Complete file:**
```
FLASK_APP=run.py
FLASK_ENV=development
SECRET_KEY=change-me-in-production
CORS_ORIGINS=http://localhost:5173

# MySQL Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_NAME=grit_seating_dev
DATABASE_USER=root
DATABASE_PASSWORD=your_password_here

# Optional: Enable SQL query logging for debugging
SQLALCHEMY_ECHO=False
```

---

### 12. run.py
**Purpose:** Updated entry point to use Flask app factory

**Changes:**
- Implemented app factory call
- Added configuration from environment
- Added proper host and port settings

**Complete file:**
```python
"""Application entry point with MySQL support."""

import os
from app import create_app

# Create Flask app
app = create_app(os.getenv('FLASK_ENV', 'development'))

if __name__ == "__main__":
    app.run(
        debug=app.config.get('DEBUG', True),
        host='0.0.0.0',
        port=5000
    )
```

---

## Installation Commands

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Create MySQL Database
```bash
# Connect to MySQL server
mysql -u root -p

# Create database
CREATE DATABASE grit_seating_dev;

# Exit MySQL
exit;
```

### 3. Configure Environment Variables
```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your MySQL credentials
# Update:
# DATABASE_HOST=localhost
# DATABASE_PORT=3306
# DATABASE_NAME=grit_seating_dev
# DATABASE_USER=root
# DATABASE_PASSWORD=your_actual_password
```

### 4. Initialize Database Migrations
```bash
# Initialize Flask-Migrate
flask db init

# Create initial migration
flask db migrate -m "Initial migration with User model"

# Apply migration to database
flask db upgrade
```

### 5. Run the Application
```bash
# Development mode
python run.py

# Or using Flask
flask run
```

---

## Connecting to MySQL Server

### Using MySQL Command Line
```bash
mysql -h localhost -P 3306 -u root -p
```

### Using MySQL Workbench
1. Open MySQL Workbench
2. Click "+" to create new connection
3. Connection Name: GRIT Seating Dev
4. Hostname: localhost
5. Port: 3306
6. Username: root
7. Password: [your password]
8. Click "Test Connection" then "OK"

### Using DBeaver
1. Create new connection
2. Select MySQL
3. Host: localhost
4. Port: 3306
5. Database: grit_seating_dev
6. Username: root
7. Password: [your password]
8. Test connection and connect

---

## API Endpoints

### Authentication Endpoints

#### Register User
```bash
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword",
  "is_admin": false
}
```

#### Login User
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword"
}
```

#### List Users (Admin Only)
```bash
GET /api/auth/users
Headers:
  X-User-ID: 1
```

#### Delete User (Admin Only)
```bash
DELETE /api/auth/users/2
Headers:
  X-User-ID: 1
```

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    INDEX idx_email (email)
);
```

---

## Testing the Setup

### 1. Health Check
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "MySQL"
}
```

### 2. Register a User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@example.com",
    "password": "admin123",
    "is_admin": true
  }'
```

### 3. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }'
```

---

## Troubleshooting

### Connection Refused
- Ensure MySQL server is running
- Check DATABASE_HOST and DATABASE_PORT in .env
- Verify MySQL user credentials

### Authentication Plugin Error
If you see "caching_sha2_password" error, update MySQL user:
```sql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password';
FLUSH PRIVILEGES;
```

### Migration Errors
```bash
# Reset migrations (WARNING: deletes data)
flask db downgrade base
flask db upgrade
```

---

## Notes

- All existing seating arrangement functionality remains unchanged (dashboard, upload, seating, export routes are placeholders as before)
- Passwords are hashed using werkzeug.security (pbkdf2:sha256)
- Admin-only endpoints require X-User-ID header
- Database migrations are managed by Flask-Migrate
- Environment variables are loaded from .env file using python-dotenv
