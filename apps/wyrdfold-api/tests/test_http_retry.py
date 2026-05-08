"""Tests for the shared HTTP retry helper."""

from typing import Any
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest

from app.http_client import (
    DEFAULT_USER_AGENT,
    FetchExhaustedError,
    get_http_client,
    request_with_retry,
)


def _resp(status_code: int, *, headers: dict[str, str] | None = None) -> MagicMock:
    resp = MagicMock(spec=httpx.Response)
    resp.status_code = status_code
    resp.headers = headers or {}
    return resp


@pytest.mark.asyncio
async def test_returns_response_on_first_success(mock_http_client: Any) -> None:
    mock_http_client.get = AsyncMock(return_value=_resp(200))
    resp = await request_with_retry("GET", "https://example.com")
    assert resp.status_code == 200
    assert mock_http_client.get.await_count == 1


@pytest.mark.asyncio
async def test_passes_through_non_retryable_4xx(mock_http_client: Any) -> None:
    """403/404 are returned to the caller without retry — caller decides."""
    mock_http_client.get = AsyncMock(return_value=_resp(404))
    resp = await request_with_retry("GET", "https://example.com")
    assert resp.status_code == 404
    assert mock_http_client.get.await_count == 1


@pytest.mark.asyncio
async def test_retries_on_5xx_then_succeeds(mock_http_client: Any) -> None:
    mock_http_client.get = AsyncMock(side_effect=[_resp(503), _resp(502), _resp(200)])
    resp = await request_with_retry("GET", "https://example.com", retries=2)
    assert resp.status_code == 200
    assert mock_http_client.get.await_count == 3


@pytest.mark.asyncio
async def test_exhausts_retries_on_persistent_5xx(mock_http_client: Any) -> None:
    mock_http_client.get = AsyncMock(return_value=_resp(503))
    with pytest.raises(FetchExhaustedError) as excinfo:
        await request_with_retry("GET", "https://example.com", retries=2)
    assert excinfo.value.last_response is not None
    assert excinfo.value.last_response.status_code == 503
    assert mock_http_client.get.await_count == 3


@pytest.mark.asyncio
async def test_retries_on_429(mock_http_client: Any) -> None:
    mock_http_client.get = AsyncMock(side_effect=[_resp(429), _resp(200)])
    resp = await request_with_retry("GET", "https://example.com", retries=1)
    assert resp.status_code == 200
    assert mock_http_client.get.await_count == 2


@pytest.mark.asyncio
async def test_retries_on_transport_error(mock_http_client: Any) -> None:
    mock_http_client.get = AsyncMock(side_effect=[httpx.ConnectError("nope"), _resp(200)])
    resp = await request_with_retry("GET", "https://example.com", retries=1)
    assert resp.status_code == 200
    assert mock_http_client.get.await_count == 2


@pytest.mark.asyncio
async def test_exhausts_on_persistent_transport_error(mock_http_client: Any) -> None:
    mock_http_client.get = AsyncMock(side_effect=httpx.TimeoutException("slow"))
    with pytest.raises(FetchExhaustedError) as excinfo:
        await request_with_retry("GET", "https://example.com", retries=1)
    assert excinfo.value.last_exception is not None
    assert excinfo.value.last_response is None


@pytest.mark.asyncio
async def test_post_method_dispatches_correctly(mock_http_client: Any) -> None:
    mock_http_client.post = AsyncMock(return_value=_resp(200))
    resp = await request_with_retry("POST", "https://example.com", json={"x": 1})
    assert resp.status_code == 200
    mock_http_client.post.assert_awaited_once_with("https://example.com", json={"x": 1})


@pytest.mark.asyncio
async def test_default_user_agent_set_on_client() -> None:
    """Job-board APIs (especially Workday) reject default httpx UA — verify
    our shared client always sends a recognizable identity.

    Closes and resets the singleton so the real client isn't left bound
    to this test's event loop (which would leak ``"Event loop is closed"``
    errors into the next async test).
    """
    import app.http_client as http_mod

    saved = http_mod._client
    http_mod._client = None
    try:
        client = get_http_client()
        assert client.headers.get("User-Agent") == DEFAULT_USER_AGENT
        await client.aclose()
    finally:
        http_mod._client = saved


@pytest.mark.asyncio
async def test_unsupported_method_raises_value_error(mock_http_client: Any) -> None:
    """Defensive: typo in method name fails fast instead of silently
    falling back to MagicMock's auto-attribute behavior."""
    # MagicMock auto-creates attributes, so we need a strict mock to
    # exercise the missing-method branch. Spec the client to httpx.AsyncClient.
    import app.http_client as http_mod

    strict = MagicMock(spec=httpx.AsyncClient)
    strict.is_closed = False
    original = http_mod._client
    http_mod._client = strict
    try:
        with pytest.raises(ValueError, match="unsupported HTTP method"):
            await request_with_retry("BREW", "https://example.com")
    finally:
        http_mod._client = original
