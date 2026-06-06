"""Typed errors for LLM service failures.

The Anthropic SDK (and OpenRouter, which speaks the same shape) raises
``APIStatusError`` subclasses with vendor-specific messages — e.g.
``"Insufficient credits. Add more using https://openrouter.ai/..."``
for a 402, or rate-limit JSON for 429. Letting those bubble untouched
into the FastAPI response leaks operator concerns to end users (and to
Sentry stack traces) and gives no signal to the FE about whether the
failure is retryable.

This module defines a small hierarchy of *intent* — what the failure
means to the application — and a translator that maps SDK exceptions
onto it. Routers don't need to catch anything: a single FastAPI
exception handler (registered in ``app/main.py``) converts these into
JSON responses with a user-safe ``detail`` string and the appropriate
HTTP status, while preserving the original cause for Sentry.
"""

from __future__ import annotations

from typing import Any


class LLMServiceError(Exception):
    """Base class for all LLM-provider failures we expose to callers.

    ``reason`` is a stable, low-cardinality tag for logging / Sentry
    grouping (e.g. ``"quota_exhausted"``, ``"rate_limited"``).
    ``user_message`` is the string the FE / end user should see.
    ``http_status`` is the response code the exception handler emits.
    """

    reason: str = "llm_error"
    user_message: str = (
        "We couldn't reach the AI service right now. Please try again in a few minutes."
    )
    http_status: int = 503

    def __init__(
        self,
        user_message: str | None = None,
        *,
        reason: str | None = None,
        http_status: int | None = None,
        upstream_status: int | None = None,
    ) -> None:
        if user_message is not None:
            self.user_message = user_message
        if reason is not None:
            self.reason = reason
        if http_status is not None:
            self.http_status = http_status
        self.upstream_status = upstream_status
        super().__init__(self.user_message)


class LLMQuotaExhaustedError(LLMServiceError):
    """Provider billing exhausted (402). Operator must top up credits."""

    reason = "quota_exhausted"
    user_message = (
        "Our AI service is temporarily unavailable. We've been notified — "
        "please try again in a little while."
    )
    http_status = 503


class LLMRateLimitedError(LLMServiceError):
    """Provider returned 429. Transient — retry after a backoff."""

    reason = "rate_limited"
    user_message = (
        "The AI service is busy right now. Please wait a moment and try again."
    )
    http_status = 503


class LLMUpstreamUnavailableError(LLMServiceError):
    """Provider returned 5xx or connection failed. Transient."""

    reason = "upstream_unavailable"
    user_message = (
        "We couldn't reach the AI service right now. Please try again in a few minutes."
    )
    http_status = 503


class LLMAuthError(LLMServiceError):
    """Provider returned 401/403. Misconfigured API key — operator fix."""

    reason = "auth_failed"
    # Don't expose "API key invalid" to end users. They can't act on it.
    user_message = (
        "Our AI service is temporarily unavailable. We've been notified."
    )
    http_status = 503


# Status codes the Anthropic / OpenRouter API surfaces that we treat as
# user-facing transient failures. 400/422 are application bugs (bad
# tool schema, malformed request) and should keep bubbling as 500 so
# Sentry surfaces them — we don't translate those.
def translate_api_status_error(exc: Any) -> LLMServiceError | None:
    """Map an ``anthropic.APIStatusError`` onto a typed app-level error.

    Returns ``None`` if the status code isn't one we treat as
    user-facing transient (4xx that signals a bug in our request, or
    anything we haven't classified). Callers should re-raise in that
    case so the unhandled-exception handler logs it as a 500.

    Accepts ``Any`` rather than importing ``anthropic.APIStatusError``
    at module scope so this module stays cheap to import in tests that
    don't have the SDK installed; we just duck-type on
    ``.status_code``.
    """
    status = getattr(exc, "status_code", None)
    if status is None:
        return None

    if status == 402:
        return LLMQuotaExhaustedError(upstream_status=status)
    if status == 429:
        return LLMRateLimitedError(upstream_status=status)
    if status in (401, 403):
        return LLMAuthError(upstream_status=status)
    if status in (500, 502, 503, 504, 529):
        return LLMUpstreamUnavailableError(upstream_status=status)
    return None
