"""Tests for the supabase-py retry helper."""

from typing import Any
from unittest.mock import MagicMock

import httpx
import pytest

from app.services.supabase_retry import (
    execute_with_retry,
    execute_with_retry_sync,
)


class _Counter:
    """Helper to build a function that fails N times then succeeds."""

    def __init__(self, fail_times: int, exc: Exception, success_value: Any = "ok"):
        self.fail_times = fail_times
        self.exc = exc
        self.success_value = success_value
        self.calls = 0

    def __call__(self) -> Any:
        self.calls += 1
        if self.calls <= self.fail_times:
            raise self.exc
        return self.success_value


@pytest.fixture(autouse=True)
def _no_sleep(monkeypatch):
    """Skip the retry backoff in tests so they don't burn wall-clock."""
    import app.services.supabase_retry as mod

    monkeypatch.setattr(mod.time, "sleep", lambda _s: None)
    yield


def test_returns_value_on_first_success() -> None:
    fn = _Counter(fail_times=0, exc=httpx.RemoteProtocolError("x"))
    result = execute_with_retry_sync(fn, label="test")
    assert result == "ok"
    assert fn.calls == 1


def test_retries_then_succeeds_on_remote_protocol_error() -> None:
    fn = _Counter(fail_times=2, exc=httpx.RemoteProtocolError("disconnected"))
    result = execute_with_retry_sync(fn, label="test", retries=2)
    assert result == "ok"
    assert fn.calls == 3


def test_retries_on_connect_error() -> None:
    fn = _Counter(fail_times=1, exc=httpx.ConnectError("nope"))
    result = execute_with_retry_sync(fn, label="test", retries=1)
    assert result == "ok"
    assert fn.calls == 2


def test_retries_on_timeout_exception() -> None:
    fn = _Counter(fail_times=1, exc=httpx.TimeoutException("slow"))
    result = execute_with_retry_sync(fn, label="test", retries=1)
    assert result == "ok"
    assert fn.calls == 2


def test_raises_after_exhausting_retries() -> None:
    fn = _Counter(fail_times=99, exc=httpx.RemoteProtocolError("persistent"))
    with pytest.raises(httpx.RemoteProtocolError):
        execute_with_retry_sync(fn, label="test", retries=2)
    assert fn.calls == 3  # initial + 2 retries


def test_does_not_retry_on_http_status_error() -> None:
    """4xx/5xx from raise_for_status are protocol-level rejections — retrying
    a 422 won't unstick it. The helper should let those through unchanged."""
    response = MagicMock(spec=httpx.Response)
    response.status_code = 422
    fn = _Counter(
        fail_times=99,
        exc=httpx.HTTPStatusError("bad", request=MagicMock(), response=response),
    )
    with pytest.raises(httpx.HTTPStatusError):
        execute_with_retry_sync(fn, label="test", retries=2)
    assert fn.calls == 1  # no retry


def test_does_not_retry_on_unrelated_exception() -> None:
    """A bug in the SQL builder (TypeError, ValueError, etc.) shouldn't
    get retried — the call is broken, not transient."""
    fn = _Counter(fail_times=99, exc=ValueError("broken"))
    with pytest.raises(ValueError):
        execute_with_retry_sync(fn, label="test", retries=2)
    assert fn.calls == 1


@pytest.mark.asyncio
async def test_async_wrapper_runs_in_thread_and_retries() -> None:
    fn = _Counter(fail_times=1, exc=httpx.RemoteProtocolError("once"))
    result = await execute_with_retry(fn, label="async-test", retries=1)
    assert result == "ok"
    assert fn.calls == 2
