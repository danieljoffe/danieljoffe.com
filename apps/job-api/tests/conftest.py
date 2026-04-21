import os

# Set required env vars BEFORE importing the app so Settings picks them up.
os.environ.setdefault("ADMIN_SESSION_SECRET", "x" * 32)
os.environ.setdefault("JOB_API_KEY", "testkey")
# Force-overwrite so a local .env with restrictive hosts can't break tests.
os.environ["ALLOWED_HOSTS"] = "*"

from unittest.mock import AsyncMock, MagicMock, patch  # noqa: E402

import pytest  # noqa: E402

from app.seed.keyword_config import keyword_config  # noqa: E402


@pytest.fixture
def config():
    return keyword_config


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
