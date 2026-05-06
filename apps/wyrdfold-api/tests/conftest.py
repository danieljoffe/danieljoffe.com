import os

# Set required env vars BEFORE importing the app so Settings picks them up.
os.environ.setdefault("SUPABASE_URL", "https://test-project.supabase.co")
os.environ.setdefault("WYRDFOLD_API_KEY", "testkey")
# Force-overwrite so a local .env with restrictive hosts can't break tests.
os.environ["ALLOWED_HOSTS"] = "*"

from unittest.mock import MagicMock

import pytest

from app.cache import job_list_cache


@pytest.fixture(autouse=True)
def _clear_caches():
    """Prevent cross-test cache pollution from the in-memory TTL cache."""
    job_list_cache.invalidate()
    yield
    job_list_cache.invalidate()


@pytest.fixture
def mock_http_client():
    """Provides a mock httpx client injected into the http_client module.

    Usage in tests:
        async def test_something(mock_http_client):
            mock_http_client.get = AsyncMock(return_value=mock_response)
            result = await some_fetcher("token")
    """
    import app.http_client as http_mod

    client = MagicMock()
    client.is_closed = False
    original = http_mod._client
    http_mod._client = client
    yield client
    http_mod._client = original
