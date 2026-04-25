import os

import pytest

# Force-set env vars BEFORE importing the app so Settings picks them up.
# Direct assignment (not setdefault) because Nx auto-loads .env files into
# the process environment, making setdefault a no-op for vars already set.
os.environ["ADMIN_SESSION_SECRET"] = "x" * 32
os.environ["AUDIT_API_KEY"] = "testkey"
os.environ["ALLOWED_HOSTS"] = "*"


@pytest.fixture(autouse=True)
def _reset_scan_queue() -> None:  # type: ignore[misc]
    """Reset the module-level ScanQueue singleton between tests.

    Each TestClient creates its own event loop, so a Queue created in one
    loop raises RuntimeError when accessed from another.
    """
    import app.services.scan_queue as sq

    yield  # type: ignore[misc]
    sq._queue = None
