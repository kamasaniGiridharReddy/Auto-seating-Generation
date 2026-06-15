"""Application entry point with MySQL support."""

import os
from app import create_app

# Create Flask app
try:
    print("[FLASK STARTUP] Creating Flask app...")
    app = create_app(os.getenv('FLASK_ENV', 'development'))
    print("[FLASK STARTED] Flask app created successfully")
except Exception as e:
    print("[FLASK CRASH] Error during app creation:", str(e))
    import traceback
    traceback.print_exc()
    raise

if __name__ == "__main__":
    try:
        port = int(os.environ.get("PORT", 5000))
        print(f"[FLASK STARTUP] Starting Flask server on port {port}...")
        app.run(
            debug=app.config.get('DEBUG', True),
            host='0.0.0.0',
            port=port
        )
    except Exception as e:
        print("[FLASK CRASH] Error during server startup:", str(e))
        import traceback
        traceback.print_exc()
        raise
