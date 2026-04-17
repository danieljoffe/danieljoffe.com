import os

# Set required env vars BEFORE importing the app so Settings picks them up.
os.environ.setdefault("ADMIN_SESSION_SECRET", "x" * 32)
os.environ.setdefault("AUDIT_API_KEY", "testkey")
# Force-overwrite so a local .env with restrictive hosts can't break tests.
os.environ["ALLOWED_HOSTS"] = "*"
