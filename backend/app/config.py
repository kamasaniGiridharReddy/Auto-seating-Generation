"""Application configuration with MySQL support."""

import os
from dotenv import load_dotenv

load_dotenv()

# Debug: Print raw environment variables
print("[CONFIG DEBUG] Raw Environment Variables:")
print(f"  DATABASE_HOST = '{os.getenv('DATABASE_HOST', 'NOT SET')}'")
print(f"  DATABASE_PORT = '{os.getenv('DATABASE_PORT', 'NOT SET')}'")
print(f"  DATABASE_NAME = '{os.getenv('DATABASE_NAME', 'NOT SET')}'")
print(f"  DATABASE_USER = '{os.getenv('DATABASE_USER', 'NOT SET')}'")
print(f"  DATABASE_PASSWORD = '{'SET' if os.getenv('DATABASE_PASSWORD') else 'NOT SET'}'")


class Config:
    """Base configuration."""
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = os.getenv('SQLALCHEMY_ECHO', 'False').lower() == 'true'


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    
    # Build URI with explicit variables
    db_user = os.getenv('DATABASE_USER', 'root')
    db_password = os.getenv('DATABASE_PASSWORD', '')
    db_host = os.getenv('DATABASE_HOST', 'localhost')
    db_port = os.getenv('DATABASE_PORT', '3306')
    db_name = os.getenv('DATABASE_NAME', 'grit_seating_dev')
    
    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://"
        f"{db_user}:"
        f"{db_password}@"
        f"{db_host}:"
        f"{db_port}/"
        f"{db_name}"
    )
    
    # Debug: Print the exact URI being set
    masked_uri = SQLALCHEMY_DATABASE_URI.replace(db_password, '****' if db_password else '')
    print(f"[CONFIG DEBUG] DevelopmentConfig SQLALCHEMY_DATABASE_URI: {masked_uri}")


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    
    # Build URI with explicit variables
    db_user = os.getenv('DATABASE_USER')
    db_password = os.getenv('DATABASE_PASSWORD')
    db_host = os.getenv('DATABASE_HOST')
    db_port = os.getenv('DATABASE_PORT', '3306')
    db_name = os.getenv('DATABASE_NAME')
    
    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://"
        f"{db_user}:"
        f"{db_password}@"
        f"{db_host}:"
        f"{db_port}/"
        f"{db_name}"
    )


class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    
    # Build URI with explicit variables
    db_user = os.getenv('DATABASE_USER', 'root')
    db_password = os.getenv('DATABASE_PASSWORD', '')
    db_host = os.getenv('DATABASE_HOST', 'localhost')
    db_port = os.getenv('DATABASE_PORT', '3306')
    db_name = os.getenv('DATABASE_NAME', 'grit_seating_test')
    
    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://"
        f"{db_user}:"
        f"{db_password}@"
        f"{db_host}:"
        f"{db_port}/"
        f"{db_name}"
    )


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
