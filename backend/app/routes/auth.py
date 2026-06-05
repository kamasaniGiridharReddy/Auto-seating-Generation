"""Authentication routes for user management."""

from flask import Blueprint, request, jsonify
from app.services.auth_service import (
    register_user,
    authenticate_user,
    delete_user,
    list_users
)

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

# Allowed email domains
ALLOWED_DOMAINS = ['@nxtwave.co.in', '@nxtwave.tech', '@nxtwave.com']


def validate_email_domain(email):
    """Validate email domain against allowed domains."""
    if not email or '@' not in email:
        return False
    email_domain = email.lower().split('@')[1]
    return any(domain == f'@{email_domain}' for domain in ALLOWED_DOMAINS)


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
        print("[AUTH ROUTE HIT]", request.path)
        
        data = request.get_json()
        print("[AUTH PAYLOAD]", data)
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        name = data.get("name")
        email = data.get("email")
        password = data.get("password")
        is_admin = data.get("is_admin", False)
        
        # Debug log
        print(f"[AUTH REGISTER] Signup request received: {email}")
        
        # Validation
        if not name or not email or not password:
            return jsonify({"error": "Name, email, and password are required"}), 400
        
        # Email domain validation
        if not validate_email_domain(email):
            print(f"[AUTH REGISTER] Email domain validation failed: {email}")
            return jsonify({
                "error": f"Only {', '.join(ALLOWED_DOMAINS)} email addresses are allowed"
            }), 400
        
        print(f"[AUTH REGISTER] Email domain validation passed: {email}")
        
        if len(password) < 6:
            return jsonify({"error": "Password must be at least 6 characters"}), 400
        
        # Register user
        user = register_user(name, email, password, is_admin)
        
        if user is None:
            print(f"[AUTH REGISTER] Email already registered: {email}")
            return jsonify({"error": "Email already registered"}), 409
        
        print(f"[AUTH REGISTER] User inserted successfully: {email}")
        
        return jsonify({
            "message": "User registered successfully",
            "user": user.to_dict()
        }), 201
        
    except Exception as e:
        print(f"[AUTH REGISTER] Error: {str(e)}")
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
        print("[AUTH ROUTE HIT]", request.path)
        
        data = request.get_json()
        print("[AUTH PAYLOAD]", data)
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        email = data.get("email")
        password = data.get("password")
        
        # Debug log
        print(f"[AUTH LOGIN] Login request received: {email}")
        
        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400
        
        # Authenticate user
        user = authenticate_user(email, password)
        
        if user is None:
            print(f"[AUTH LOGIN] Authentication failed: {email}")
            return jsonify({"error": "Invalid email or password"}), 401
        
        print(f"[AUTH LOGIN] Authentication successful: {email}")
        
        return jsonify({
            "message": "Login successful",
            "user": user.to_dict()
        }), 200
        
    except Exception as e:
        print(f"[AUTH LOGIN] Error: {str(e)}")
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
