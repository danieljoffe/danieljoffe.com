"""Tests for the target-driven source discovery service.

Mocks the Brave Search HTTP client, the ATS detector, and the Supabase
client. Covers the happy path (URL → classify → insert) and each of the
explicit early-exit branches (no API key, no keywords, query cap, dedup,
unclassified, filtered).
"""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.targets import (
    CategoryProfile,
    DomainProfile,
    JobTarget,
    NegativeProfile,
    ScoringProfile,
    SeniorityProfile,
)
from app.services.ats_detect import DetectResult
from app.services.source_discovery import (
    DiscoveryRunStats,
    run_discovery_for_target,
)

_TARGET_ID = "00000000-0000-4000-8000-000000000001"


def _make_target(keywords: list[str] | None = None) -> JobTarget:
    """Build a minimal JobTarget for discovery testing."""
    now = datetime(2026, 5, 30, tzinfo=UTC)
    return JobTarget(
        id=_TARGET_ID,
        label="Director of CX Ops",
        normalized_label="director of cx ops",
        description=None,
        scoring_profile=ScoringProfile(
            categories={
                "core": CategoryProfile(keywords={"foo": 1}, weight=1.0)
            },
            seniority=SeniorityProfile(level="director", signals=["director"]),
            domain=DomainProfile(signals=[], weight=0.5),
            negative=NegativeProfile(keywords=[], weight=-10.0),
        ),
        search_keywords=keywords if keywords is not None else ["director of cx"],
        is_active=True,
        activation_status="ready",
        profile_version=1,
        created_at=now,
        updated_at=now,
    )


def _make_supabase(
    existing_tokens: list[str] | None = None,
    rpc_insert_returns: bool = True,
) -> MagicMock:
    """Mock Supabase client.

    Returns ``existing_tokens`` from ``sources`` select queries (used by the
    dedup snapshot at the top of ``run_discovery_for_target``). The
    ``insert_source_if_not_exists`` RPC returns ``rpc_insert_returns`` so
    tests can simulate both "fresh insert" and "duplicate" outcomes without
    touching a real database. All other table operations return a generic
    chainable mock.
    """
    supabase = MagicMock()

    rows = [{"board_token": t} for t in (existing_tokens or [])]
    supabase.table.return_value.select.return_value.execute.return_value.data = rows

    # The RPC returns a bare bool (scalar-returning Postgres function). The
    # production code accepts bool / list[bool] / list[{name: bool}] response
    # shapes; tests use the bare bool form for clarity.
    rpc_resp = MagicMock()
    rpc_resp.data = rpc_insert_returns
    supabase.rpc.return_value.execute.return_value = rpc_resp
    return supabase


@pytest.mark.asyncio
async def test_discovery_no_api_key_exits_cleanly(monkeypatch):
    """Empty BRAVE_SEARCH_API_KEY logs a warning and returns zeroed stats."""
    from app.config import settings as live_settings

    monkeypatch.setattr(live_settings, "brave_search_api_key", "")
    supabase = _make_supabase()
    stats = await run_discovery_for_target(supabase, _make_target())
    assert stats == DiscoveryRunStats(
        target_id=_TARGET_ID,
        queries_issued=0,
        urls_examined=0,
        inserted=0,
        duplicates=0,
        unclassified=0,
        filtered=0,
    )


@pytest.mark.asyncio
async def test_discovery_target_with_no_keywords_skips_run(monkeypatch):
    """A target with empty ``search_keywords`` should not issue any queries."""
    from app.config import settings as live_settings

    monkeypatch.setattr(live_settings, "brave_search_api_key", "test-key")
    supabase = _make_supabase()
    stats = await run_discovery_for_target(supabase, _make_target(keywords=[]))
    assert stats.queries_issued == 0
    assert stats.inserted == 0


@pytest.mark.asyncio
async def test_discovery_happy_path_inserts_new_source(monkeypatch):
    """One keyword → one new URL → detect_ats succeeds → inserted."""
    from app.config import settings as live_settings

    monkeypatch.setattr(live_settings, "brave_search_api_key", "test-key")
    # Force the run to issue exactly one query across all site filters by
    # capping at 1.
    monkeypatch.setattr(live_settings, "discovery_query_cap_per_run", 1)

    supabase = _make_supabase(existing_tokens=[])

    # Mock the Brave response: one result URL.
    fake_brave = AsyncMock(return_value=["https://boards.greenhouse.io/example"])
    # Mock detect_ats: classifies the URL cleanly with a real job count.
    fake_detect = AsyncMock(
        return_value=DetectResult(
            provider="greenhouse",
            board_token="example",
            company_name="Example Co",
            job_count=5,
        )
    )

    with (
        patch("app.services.source_discovery._brave_search", fake_brave),
        patch("app.services.source_discovery.detect_ats", fake_detect),
    ):
        stats = await run_discovery_for_target(supabase, _make_target())

    assert stats.queries_issued == 1
    assert stats.inserted == 1
    assert stats.unclassified == 0
    # Verify we routed the insert through the RPC, not a raw INSERT.
    rpc_calls = [
        call
        for call in supabase.rpc.call_args_list
        if call.args[0] == "insert_source_if_not_exists"
    ]
    assert len(rpc_calls) == 1
    params = rpc_calls[0].args[1]
    assert params == {
        "p_provider": "greenhouse",
        "p_board_token": "example",
        "p_company_name": "Example Co",
    }


@pytest.mark.asyncio
async def test_discovery_dedupes_existing_board_tokens(monkeypatch):
    """A URL whose token is already in ``sources`` should not re-insert."""
    from app.config import settings as live_settings

    monkeypatch.setattr(live_settings, "brave_search_api_key", "test-key")
    monkeypatch.setattr(live_settings, "discovery_query_cap_per_run", 1)

    supabase = _make_supabase(existing_tokens=["example"])

    fake_brave = AsyncMock(return_value=["https://boards.greenhouse.io/example"])
    fake_detect = AsyncMock(
        return_value=DetectResult(
            provider="greenhouse",
            board_token="example",
            company_name="Example Co",
            job_count=5,
        )
    )

    with (
        patch("app.services.source_discovery._brave_search", fake_brave),
        patch("app.services.source_discovery.detect_ats", fake_detect),
    ):
        stats = await run_discovery_for_target(supabase, _make_target())

    assert stats.duplicates == 1
    assert stats.inserted == 0
    # Snapshot-level dedup should short-circuit before the RPC fires — we
    # never even attempt the insert for a known board_token.
    rpc_inserts = [
        call
        for call in supabase.rpc.call_args_list
        if call.args[0] == "insert_source_if_not_exists"
    ]
    assert rpc_inserts == []


@pytest.mark.asyncio
async def test_discovery_unclassified_urls_are_logged_but_not_inserted(monkeypatch):
    """detect_ats returning None should bump unclassified and skip insert."""
    from app.config import settings as live_settings

    monkeypatch.setattr(live_settings, "brave_search_api_key", "test-key")
    monkeypatch.setattr(live_settings, "discovery_query_cap_per_run", 1)

    supabase = _make_supabase()
    fake_brave = AsyncMock(return_value=["https://example.com/jobs"])
    fake_detect = AsyncMock(return_value=None)

    with (
        patch("app.services.source_discovery._brave_search", fake_brave),
        patch("app.services.source_discovery.detect_ats", fake_detect),
    ):
        stats = await run_discovery_for_target(supabase, _make_target())

    assert stats.unclassified == 1
    assert stats.inserted == 0


@pytest.mark.asyncio
async def test_discovery_filters_dead_boards(monkeypatch):
    """Classified URL with ``job_count = 0`` should be filtered, not inserted."""
    from app.config import settings as live_settings

    monkeypatch.setattr(live_settings, "brave_search_api_key", "test-key")
    monkeypatch.setattr(live_settings, "discovery_query_cap_per_run", 1)

    supabase = _make_supabase()
    fake_brave = AsyncMock(return_value=["https://boards.greenhouse.io/empty"])
    fake_detect = AsyncMock(
        return_value=DetectResult(
            provider="greenhouse",
            board_token="empty",
            company_name="Empty Co",
            job_count=0,
        )
    )

    with (
        patch("app.services.source_discovery._brave_search", fake_brave),
        patch("app.services.source_discovery.detect_ats", fake_detect),
    ):
        stats = await run_discovery_for_target(supabase, _make_target())

    assert stats.filtered == 1
    assert stats.inserted == 0


@pytest.mark.asyncio
async def test_discovery_respects_query_cap(monkeypatch):
    """Hitting the cap should short-circuit the loop and return early."""
    from app.config import settings as live_settings

    monkeypatch.setattr(live_settings, "brave_search_api_key", "test-key")
    # Cap of 2 with two keywords across 6 site filters = 12 possible
    # queries; cap should fire after the second.
    monkeypatch.setattr(live_settings, "discovery_query_cap_per_run", 2)

    supabase = _make_supabase()
    fake_brave = AsyncMock(return_value=[])
    fake_detect = AsyncMock(return_value=None)

    target = _make_target(keywords=["a", "b"])

    with (
        patch("app.services.source_discovery._brave_search", fake_brave),
        patch("app.services.source_discovery.detect_ats", fake_detect),
    ):
        stats = await run_discovery_for_target(supabase, target)

    assert stats.queries_issued == 2
    assert fake_brave.await_count == 2


@pytest.mark.asyncio
async def test_discovery_rpc_returning_false_marks_duplicate(monkeypatch):
    """If the insert_source_if_not_exists RPC reports the row already
    existed (race against another runner), the discovery loop should
    count it as a duplicate instead of an insert.
    """
    from app.config import settings as live_settings

    monkeypatch.setattr(live_settings, "brave_search_api_key", "test-key")
    monkeypatch.setattr(live_settings, "discovery_query_cap_per_run", 1)

    # Snapshot says token is new, but the RPC reports a race-condition
    # collision (someone else inserted it between snapshot and write).
    supabase = _make_supabase(existing_tokens=[], rpc_insert_returns=False)

    fake_brave = AsyncMock(return_value=["https://boards.greenhouse.io/example"])
    fake_detect = AsyncMock(
        return_value=DetectResult(
            provider="greenhouse",
            board_token="example",
            company_name="Example Co",
            job_count=5,
        )
    )

    with (
        patch("app.services.source_discovery._brave_search", fake_brave),
        patch("app.services.source_discovery.detect_ats", fake_detect),
    ):
        stats = await run_discovery_for_target(supabase, _make_target())

    assert stats.inserted == 0
    assert stats.duplicates == 1
    # RPC was still called — we tried, the DB told us it was a no-op.
    rpc_calls = [
        c
        for c in supabase.rpc.call_args_list
        if c.args[0] == "insert_source_if_not_exists"
    ]
    assert len(rpc_calls) == 1


@pytest.mark.asyncio
async def test_brave_search_retries_on_429_with_retry_after():
    """A 429 response should be retried after the server-specified delay,
    and a successful retry should return the URLs from that attempt.
    """
    from app.services import source_discovery as mod

    # First call: 429 with Retry-After: 1. Second call: 200 with one URL.
    rate_limited = MagicMock()
    rate_limited.status_code = 429
    rate_limited.headers = {"retry-after": "1"}
    rate_limited.text = ""

    ok = MagicMock()
    ok.status_code = 200
    ok.json = MagicMock(
        return_value={
            "web": {"results": [{"url": "https://boards.greenhouse.io/example"}]}
        }
    )

    client = MagicMock()
    client.get = AsyncMock(side_effect=[rate_limited, ok])

    slept: list[float] = []

    async def fake_sleep(seconds: float) -> None:
        slept.append(seconds)

    with patch.object(mod.asyncio, "sleep", fake_sleep):
        urls = await mod._brave_search(client, query="foo", count=10)

    assert urls == ["https://boards.greenhouse.io/example"]
    assert client.get.await_count == 2
    # Slept once between attempts; honoured the server's 1-second Retry-After
    # (capped at our 30-second ceiling). Anything else means we ignored the
    # header and fell back to exponential backoff incorrectly.
    assert slept == [1.0]


@pytest.mark.asyncio
async def test_brave_search_gives_up_on_non_retryable_status():
    """A 401/403/400 should NOT be retried — they're config errors."""
    from app.services import source_discovery as mod

    forbidden = MagicMock()
    forbidden.status_code = 401
    forbidden.headers = {}
    forbidden.text = "Invalid API key"

    client = MagicMock()
    client.get = AsyncMock(return_value=forbidden)

    urls = await mod._brave_search(client, query="foo", count=10)

    assert urls == []
    assert client.get.await_count == 1


@pytest.mark.asyncio
async def test_brave_search_exhausts_retries_on_persistent_5xx():
    """Persistent 503 → all three attempts fire, no infinite loop, []."""
    from app.services import source_discovery as mod

    bad_gateway = MagicMock()
    bad_gateway.status_code = 503
    bad_gateway.headers = {}
    bad_gateway.text = ""

    client = MagicMock()
    client.get = AsyncMock(return_value=bad_gateway)

    async def no_sleep(_seconds: float) -> None:
        return None

    with patch.object(mod.asyncio, "sleep", no_sleep):
        urls = await mod._brave_search(client, query="foo", count=10)

    assert urls == []
    assert client.get.await_count == mod._BRAVE_MAX_ATTEMPTS


@pytest.mark.asyncio
async def test_discovery_fires_brave_queries_concurrently(monkeypatch):
    """Two keywords across 6 site filters with a 12-query cap should kick
    off 12 concurrent Brave fetches under the semaphore, not a sequential
    one-after-the-other walk.
    """
    from app.config import settings as live_settings
    from app.services import source_discovery as mod

    monkeypatch.setattr(live_settings, "brave_search_api_key", "test-key")
    monkeypatch.setattr(live_settings, "discovery_query_cap_per_run", 12)

    supabase = _make_supabase()

    # Track how many Brave calls are *in flight* at any one moment. With
    # the 8-concurrency semaphore and 12 queries, we should see a peak of
    # at least 2 (proving the calls overlap) and at most 8.
    in_flight = 0
    peak = 0
    lock = asyncio.Lock()

    async def slow_brave(client, *, query, count):
        nonlocal in_flight, peak
        async with lock:
            in_flight += 1
            peak = max(peak, in_flight)
        await asyncio.sleep(0.01)
        async with lock:
            in_flight -= 1
        return []

    target = _make_target(keywords=["a", "b"])
    with patch.object(mod, "_brave_search", side_effect=slow_brave):
        await run_discovery_for_target(supabase, target)

    # With purely sequential execution peak would be exactly 1; with the
    # semaphore in place we expect multiple queries overlapping.
    assert peak >= 2, (
        f"expected concurrent Brave queries, peak in-flight was {peak} "
        "— is the semaphore wired up?"
    )
