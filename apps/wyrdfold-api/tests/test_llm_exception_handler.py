"""Tests for the FastAPI exception handler that converts
``LLMServiceError`` subclasses into JSON responses.

The handler lives in ``app/main.py``. We register a throwaway test
route on the app so we can exercise the real request/response cycle
through Starlette — TestClient gives us the same status code and
body shape the frontend would receive.
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app
from app.services.llm.errors import (
    LLMAuthError,
    LLMQuotaExhaustedError,
    LLMRateLimitedError,
    LLMUpstreamUnavailableError,
)

# Register one throwaway route per error case. ``add_api_route`` lets
# us do this inside the test module without touching production
# routers. The closures capture the exception class so the route
# raises the right type.


def _register_raising_route(path: str, exc_cls: type[Exception]) -> None:
    async def _raise() -> None:
        raise exc_cls()

    app.add_api_route(path, _raise, methods=["GET"])


_register_raising_route("/__test/llm/quota", LLMQuotaExhaustedError)
_register_raising_route("/__test/llm/rate_limit", LLMRateLimitedError)
_register_raising_route("/__test/llm/auth", LLMAuthError)
_register_raising_route("/__test/llm/upstream", LLMUpstreamUnavailableError)


def test_quota_exhausted_returns_503_with_user_safe_detail() -> None:
    """The flagship case: a 402 from the provider must reach the user
    as 503 + friendly text, with the vendor message gone."""
    client = TestClient(app)
    res = client.get("/__test/llm/quota")
    assert res.status_code == 503
    body = res.json()
    assert body["code"] == "quota_exhausted"
    detail = body["detail"]
    # User-safe: no vendor names, no top-up URL, no debugging hints.
    assert "openrouter" not in detail.lower()
    assert "credits" not in detail.lower()
    assert "https://" not in detail
    # And actually helpful: tells them what to do.
    assert "try again" in detail.lower()


def test_rate_limited_returns_503_with_wait_hint() -> None:
    client = TestClient(app)
    res = client.get("/__test/llm/rate_limit")
    assert res.status_code == 503
    body = res.json()
    assert body["code"] == "rate_limited"
    assert "busy" in body["detail"].lower() or "wait" in body["detail"].lower()


def test_auth_error_does_not_leak_operator_concern_to_user() -> None:
    """A 401/403 from the provider means our API key is misconfigured —
    the user can't fix it. The response must NOT say "api key" or
    similar; just a generic transient message."""
    client = TestClient(app)
    res = client.get("/__test/llm/auth")
    assert res.status_code == 503
    detail = res.json()["detail"].lower()
    assert "api key" not in detail
    assert "auth" not in detail
    assert "401" not in detail
    assert "403" not in detail


def test_upstream_unavailable_returns_503() -> None:
    client = TestClient(app)
    res = client.get("/__test/llm/upstream")
    assert res.status_code == 503
    body = res.json()
    assert body["code"] == "upstream_unavailable"
    assert body["detail"]
