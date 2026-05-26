"""Retry transient HTTP failures on supabase-py calls.

supabase-py runs over httpx, which negotiates HTTP/2 with the
Cloudflare-fronted Supabase REST endpoint. Under concurrent upsert
load (the poller flushing 122 sources in parallel) we observe stream
drops surfaced as ``httpx.RemoteProtocolError: Server disconnected``.
The underlying request was idempotent in every place we use this
helper (upsert with ON CONFLICT, UPDATE with a stable WHERE), so
re-issuing the call is safe.

Each callsite wraps the bound ``.execute`` method of a built
postgrest query so the retry re-runs the same request without
rebuilding it.
"""

from __future__ import annotations

import asyncio
import logging
import random
import time
from collections.abc import Callable
from typing import TypeVar

import httpx

logger = logging.getLogger(__name__)

T = TypeVar("T")

# Transient transport-level failures we'll retry. ``HTTPStatusError`` is
# deliberately excluded — those are protocol-level rejections (e.g. 4xx
# constraint violations) that retrying won't help.
_TRANSIENT_HTTP: tuple[type[Exception], ...] = (
    httpx.RemoteProtocolError,
    httpx.ReadError,
    httpx.WriteError,
    httpx.ConnectError,
    httpx.TimeoutException,
)


def _backoff_delay(attempt: int, base: float, cap: float) -> float:
    raw = base * (2**attempt)
    jitter: float = random.uniform(0, 0.15)  # noqa: S311 — non-cryptographic jitter
    return (raw if raw < cap else cap) + jitter


def execute_with_retry_sync(
    fn: Callable[[], T],
    *,
    label: str,
    retries: int = 2,
    backoff_base: float = 0.4,
    backoff_cap: float = 4.0,
) -> T:
    """Synchronous retry wrapper — call from inside an ``asyncio.to_thread``
    or any sync context. Retries on transient httpx failures with
    exponential backoff + jitter.
    """
    last_exc: Exception | None = None
    for attempt in range(retries + 1):
        try:
            return fn()
        except _TRANSIENT_HTTP as exc:
            last_exc = exc
            if attempt == retries:
                logger.warning(
                    "supabase %s exhausted %d retries: %s", label, retries, exc
                )
                raise
            delay = _backoff_delay(attempt, backoff_base, backoff_cap)
            logger.warning(
                "supabase %s: %s (attempt %d/%d), retrying in %.2fs",
                label,
                exc,
                attempt + 1,
                retries + 1,
                delay,
            )
            time.sleep(delay)
    raise last_exc or RuntimeError("unreachable")


async def execute_with_retry(
    fn: Callable[[], T],
    *,
    label: str,
    retries: int = 2,
    backoff_base: float = 0.4,
    backoff_cap: float = 4.0,
) -> T:
    """Async retry wrapper — runs the sync supabase-py call in a thread
    so the event loop isn't blocked during the backoff. Use this from
    async code that doesn't already own an ``asyncio.to_thread`` frame.
    """
    return await asyncio.to_thread(
        execute_with_retry_sync,
        fn,
        label=label,
        retries=retries,
        backoff_base=backoff_base,
        backoff_cap=backoff_cap,
    )
