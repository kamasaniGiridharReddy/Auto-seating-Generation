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
    print(f"[AUTH SERVICE] Registering user: {email}")
    
    # Check if user already exists
    if User.query.filter_by(email=email).first():
        print(f"[AUTH SERVICE] User already exists: {email}")
        return None
    
    user = User(name=name, email=email, is_admin=is_admin)
    user.set_password(password)
    
    print(f"[AUTH SERVICE] Password hashed for: {email}")
    
    db.session.add(user)
    db.session.commit()
    
    print(f"[AUTH SERVICE] User inserted successfully: {email}, ID: {user.id}")
    
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
    print(f"[AUTH SERVICE] Authenticating user: {email}")
    
    user = User.query.filter_by(email=email).first()
    
    if user:
        print(f"[AUTH SERVICE] User found: {email}, ID: {user.id}")
        if user.check_password(password):
            print(f"[AUTH SERVICE] Password matched for: {email}")
            return user
        else:
            print(f"[AUTH SERVICE] Password mismatch for: {email}")
    else:
        print(f"[AUTH SERVICE] User not found: {email}")
    
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
