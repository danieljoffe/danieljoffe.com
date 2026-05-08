"""Shared httpx.AsyncClient with connection pooling.

Reuses TCP connections across ATS fetcher calls instead of creating
a fresh client per request. Closed on app shutdown.
"""

from __future__ import annotations

import asyncio
import logging
import random
from typing import Any, cast

import httpx

logger = logging.getLogger(__name__)

_client: httpx.AsyncClient | None = None

# Identifies us to third-party job-board APIs. Some boards (Workday in
# particular) reject the default httpx UA outright.
DEFAULT_USER_AGENT = "wyrdfold-jobs/1.0 (+https://wyrdfold.com)"


def get_http_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            timeout=15.0,
            limits=httpx.Limits(
                max_connections=20,
                max_keepalive_connections=10,
            ),
            follow_redirects=True,
            headers={"User-Agent": DEFAULT_USER_AGENT},
        )
    return _client


async def close_http_client() -> None:
    global _client
    if _client and not _client.is_closed:
        await _client.aclose()
    _client = None


# ---- Retry helper ----------------------------------------------------------

# 429 + 5xx are treated as transient and retried with exponential backoff.
# Other 4xx (401/403/404/422) are returned to the caller without retry — the
# caller decides whether to swallow (e.g. 404 = empty board) or surface.
_RETRYABLE_STATUS = frozenset({408, 425, 429, 500, 502, 503, 504})


class FetchExhaustedError(Exception):
    """Raised by ``request_with_retry`` when all retry attempts fail.

    Carries the last response (if any) and the last exception so callers
    can inspect the failure mode without re-running the request.
    """

    def __init__(
        self,
        message: str,
        *,
        last_response: httpx.Response | None = None,
        last_exception: Exception | None = None,
    ) -> None:
        super().__init__(message)
        self.last_response = last_response
        self.last_exception = last_exception


# Module-level sleep alias so tests can patch it without touching the
# whole asyncio module. Production paths use ``asyncio.sleep`` directly.
_sleep = asyncio.sleep


async def request_with_retry(
    method: str,
    url: str,
    *,
    retries: int = 2,
    backoff_base: float = 1.0,
    backoff_cap: float = 8.0,
    timeout: float | None = None,  # noqa: ASYNC109 — forwarded to httpx, not asyncio.timeout
    **kwargs: Any,
) -> httpx.Response:
    """Issue an HTTP request with retries on transient failures.

    Retries on network errors and on 408/425/429/5xx with exponential
    backoff (``backoff_base * 2**attempt`` seconds, capped at
    ``backoff_cap``, plus up to 250 ms of jitter). Honors ``Retry-After``
    on 429 when the server provides it.

    Returns the final ``httpx.Response`` (which may itself be a non-2xx
    response if the status is non-retryable, e.g. 404). Raises
    ``FetchExhaustedError`` only when retries are spent on a transient
    failure, so callers don't have to distinguish "real 404" from "we
    gave up after 3 tries."
    """
    last_response: httpx.Response | None = None
    last_exc: Exception | None = None
    client = get_http_client()

    request_kwargs = dict(kwargs)
    if timeout is not None:
        request_kwargs["timeout"] = timeout

    method_lower = method.lower()
    method_func = getattr(client, method_lower, None)
    if method_func is None:
        raise ValueError(f"unsupported HTTP method: {method}")

    for attempt in range(retries + 1):
        try:
            resp = await method_func(url, **request_kwargs)
        except httpx.HTTPError as exc:
            # ``HTTPError`` is the umbrella for transport failures
            # (``TimeoutException``, ``NetworkError``, etc.). We never call
            # ``raise_for_status`` ourselves, so ``HTTPStatusError`` doesn't
            # reach this branch — non-2xx flows through the status-code check
            # below.
            last_exc = exc
            last_response = None
            if attempt == retries:
                break
            await _sleep(_backoff_seconds(attempt, backoff_base, backoff_cap))
            continue

        if resp.status_code not in _RETRYABLE_STATUS:
            return cast(httpx.Response, resp)

        last_response = resp
        last_exc = None
        if attempt == retries:
            break

        delay = _retry_after_seconds(resp) or _backoff_seconds(attempt, backoff_base, backoff_cap)
        logger.warning(
            "retrying %s %s after %s in %.2fs (attempt %d/%d)",
            method,
            url,
            resp.status_code,
            delay,
            attempt + 1,
            retries + 1,
        )
        await _sleep(delay)

    raise FetchExhaustedError(
        f"{method} {url} exhausted retries",
        last_response=last_response,
        last_exception=last_exc,
    )


def _backoff_seconds(attempt: int, base: float, cap: float) -> float:
    raw: float = base * (2**attempt)
    capped: float = raw if raw < cap else cap
    jitter: float = random.uniform(0, 0.25)  # noqa: S311 — non-cryptographic jitter
    return capped + jitter


def _retry_after_seconds(resp: httpx.Response) -> float | None:
    """Parse a ``Retry-After`` header. Honors integer-seconds form only.

    HTTP-date form is ignored — it would need ``email.utils.parsedate_to_datetime``
    and a clock comparison, and job-board APIs that send ``Retry-After`` use
    the integer-seconds form in practice.
    """
    raw = resp.headers.get("retry-after")
    if not raw:
        return None
    try:
        return max(0.0, float(raw))
    except ValueError:
        return None
