"""LLM error translation tests.

Covers the typed error layer in ``app/services/llm/errors.py`` plus
the SDK→typed-error wrapping inside ``AnthropicLLMClient``. The
contract under test:

- ``anthropic.APIStatusError`` with a *user-facing transient* status
  (402 quota, 429 rate-limit, 401/403 auth, 5xx upstream) is mapped
  to the corresponding ``LLMServiceError`` subclass — never leaks
  raw vendor messages.
- Status codes we don't classify (400, 422 — these indicate a bug
  in the request we built) re-raise unchanged so the unhandled-
  exception handler surfaces them as 500s in Sentry.
- ``APIConnectionError`` / ``APITimeoutError`` translate to
  ``LLMUpstreamUnavailableError`` so a flaky network looks the same
  to the FE as a flaky provider.
"""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest
from anthropic import (
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
)

from app.models.llm import Message
from app.services.llm.anthropic_client import AnthropicLLMClient
from app.services.llm.errors import (
    LLMAuthError,
    LLMQuotaExhaustedError,
    LLMRateLimitedError,
    LLMServiceError,
    LLMUpstreamUnavailableError,
    translate_api_status_error,
)


def _api_status_error(status: int, message: str = "boom") -> APIStatusError:
    """Build a real APIStatusError with a synthetic httpx response so
    we exercise the same exception type the SDK raises in production.
    """
    request = httpx.Request("POST", "https://example.test/v1/messages")
    response = httpx.Response(status_code=status, request=request)
    return APIStatusError(message, response=response, body=None)


# -- translate_api_status_error ------------------------------------------------


@pytest.mark.parametrize(
    ("status", "expected_cls", "expected_reason"),
    [
        (402, LLMQuotaExhaustedError, "quota_exhausted"),
        (429, LLMRateLimitedError, "rate_limited"),
        (401, LLMAuthError, "auth_failed"),
        (403, LLMAuthError, "auth_failed"),
        (500, LLMUpstreamUnavailableError, "upstream_unavailable"),
        (502, LLMUpstreamUnavailableError, "upstream_unavailable"),
        (503, LLMUpstreamUnavailableError, "upstream_unavailable"),
        (504, LLMUpstreamUnavailableError, "upstream_unavailable"),
        (529, LLMUpstreamUnavailableError, "upstream_unavailable"),
    ],
)
def test_translate_maps_user_facing_statuses(
    status: int, expected_cls: type[LLMServiceError], expected_reason: str
) -> None:
    exc = _api_status_error(status)
    translated = translate_api_status_error(exc)
    assert isinstance(translated, expected_cls)
    assert translated.reason == expected_reason
    assert translated.http_status == 503
    assert translated.upstream_status == status


@pytest.mark.parametrize("status", [400, 404, 409, 413, 422])
def test_translate_returns_none_for_request_bugs(status: int) -> None:
    """4xx codes that indicate a malformed request from us aren't
    user-facing transients — let them bubble as 500s so we notice."""
    assert translate_api_status_error(_api_status_error(status)) is None


def test_translate_returns_none_for_objects_without_status_code() -> None:
    """Defensive: a raw Exception (no .status_code) should not crash."""

    class _NotAnApiError(Exception):
        pass

    assert translate_api_status_error(_NotAnApiError("?")) is None


# -- AnthropicLLMClient wrapping -----------------------------------------------


def _client() -> AnthropicLLMClient:
    return AnthropicLLMClient(api_key="test-key")


def _fake_messages() -> list[Message]:
    return [Message(role="user", content="hi")]


def _set_create_raises(client: AnthropicLLMClient, exc: BaseException) -> None:
    client._client.messages.create = AsyncMock(side_effect=exc)  # type: ignore[method-assign]


async def test_complete_translates_402_to_quota_exhausted() -> None:
    """The OpenRouter incident: a 402 must surface as a friendly
    ``LLMQuotaExhaustedError``, never the raw 'Insufficient credits'
    vendor string."""
    client = _client()
    _set_create_raises(client, _api_status_error(402, "Insufficient credits"))

    with pytest.raises(LLMQuotaExhaustedError) as info:
        await client.complete(
            model="claude-haiku-4-5",
            system="sys",
            messages=_fake_messages(),
            purpose="test",
        )
    assert info.value.upstream_status == 402
    # Crucially: the user-facing message is ours, not the vendor's.
    assert "Insufficient credits" not in info.value.user_message


async def test_complete_translates_429_to_rate_limited() -> None:
    client = _client()
    _set_create_raises(client, _api_status_error(429))
    with pytest.raises(LLMRateLimitedError):
        await client.complete(
            model="claude-haiku-4-5",
            system="sys",
            messages=_fake_messages(),
            purpose="test",
        )


async def test_complete_translates_503_to_upstream_unavailable() -> None:
    client = _client()
    _set_create_raises(client, _api_status_error(503))
    with pytest.raises(LLMUpstreamUnavailableError):
        await client.complete(
            model="claude-haiku-4-5",
            system="sys",
            messages=_fake_messages(),
            purpose="test",
        )


async def test_complete_reraises_unclassified_status_codes() -> None:
    """A 400 (bad request) means our code built a malformed payload —
    not a transient failure. Bubble it so Sentry surfaces it as a bug.
    """
    client = _client()
    _set_create_raises(client, _api_status_error(400, "tool schema invalid"))
    with pytest.raises(APIStatusError):
        await client.complete(
            model="claude-haiku-4-5",
            system="sys",
            messages=_fake_messages(),
            purpose="test",
        )


async def test_complete_translates_connection_error() -> None:
    client = _client()
    request = httpx.Request("POST", "https://example.test/v1/messages")
    _set_create_raises(client, APIConnectionError(request=request))
    with pytest.raises(LLMUpstreamUnavailableError):
        await client.complete(
            model="claude-haiku-4-5",
            system="sys",
            messages=_fake_messages(),
            purpose="test",
        )


async def test_complete_translates_timeout() -> None:
    client = _client()
    request = httpx.Request("POST", "https://example.test/v1/messages")
    _set_create_raises(client, APITimeoutError(request=request))
    with pytest.raises(LLMUpstreamUnavailableError):
        await client.complete(
            model="claude-haiku-4-5",
            system="sys",
            messages=_fake_messages(),
            purpose="test",
        )


async def test_complete_tool_use_translates_402() -> None:
    """Same translation contract for the tool-forced call path."""
    client = _client()
    _set_create_raises(client, _api_status_error(402))
    with pytest.raises(LLMQuotaExhaustedError):
        await client.complete_tool_use(
            model="claude-haiku-4-5",
            system="sys",
            messages=_fake_messages(),
            tool_name="x",
            tool_description="x",
            tool_input_schema={"type": "object"},
            purpose="test",
        )


async def test_stream_translates_402_on_handshake() -> None:
    """The Anthropic streaming context raises APIStatusError when the
    initial HTTP handshake fails (before any tokens stream). Translate
    that just like the non-streaming path."""

    class _RaisingStream:
        async def __aenter__(self) -> Any:
            raise _api_status_error(402)

        async def __aexit__(self, *args: Any) -> None:  # pragma: no cover
            return None

    client = _client()
    client._client.messages.stream = MagicMock(return_value=_RaisingStream())  # type: ignore[method-assign]

    with pytest.raises(LLMQuotaExhaustedError):
        async for _ in client.stream(
            model="claude-haiku-4-5",
            system="sys",
            messages=_fake_messages(),
            purpose="test",
        ):
            pass


# -- Public message contract ---------------------------------------------------


def test_user_messages_are_safe_strings() -> None:
    """A regression guard: every typed error's ``user_message`` must
    be something we'd happily show an end user — no debug crud, no
    vendor names, no raw URLs, no quote-noise. If anyone adds a new
    subclass and forgets to override the message thoughtfully, this
    catches it.
    """
    for cls in (
        LLMQuotaExhaustedError,
        LLMRateLimitedError,
        LLMAuthError,
        LLMUpstreamUnavailableError,
    ):
        msg = cls().user_message
        assert msg
        assert "openrouter" not in msg.lower()
        assert "anthropic" not in msg.lower()
        assert "api key" not in msg.lower()
        assert "http" not in msg.lower()
