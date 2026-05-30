"""Tests for the target-driven source discovery service.

Mocks the Brave Search HTTP client, the ATS detector, and the Supabase
client. Covers the happy path (URL → classify → insert) and each of the
explicit early-exit branches (no API key, no keywords, query cap, dedup,
unclassified, filtered).
"""

from __future__ import annotations

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


def _make_supabase(existing_tokens: list[str] | None = None) -> MagicMock:
    """Mock Supabase client.

    Returns ``existing_tokens`` from ``sources`` select queries (used by the
    dedup snapshot at the top of ``run_discovery_for_target``). All other
    table operations return a generic chainable mock.
    """
    supabase = MagicMock()

    rows = [{"board_token": t} for t in (existing_tokens or [])]
    supabase.table.return_value.select.return_value.execute.return_value.data = rows
    # insert is the only path that distinguishes "wrote" from "didn't write".
    supabase.table.return_value.insert.return_value.execute.return_value = MagicMock()
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
    # Verify we actually called the sources insert with the right shape.
    inserts = [
        call
        for call in supabase.table.return_value.insert.call_args_list
        if isinstance(call.args[0], dict)
        and call.args[0].get("provider") == "greenhouse"
    ]
    assert len(inserts) == 1
    assert inserts[0].args[0]["board_token"] == "example"
    assert inserts[0].args[0]["enabled"] is True


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
    # No insert into sources for the duplicate token.
    source_inserts = [
        call
        for call in supabase.table.return_value.insert.call_args_list
        if isinstance(call.args[0], dict)
        and call.args[0].get("provider") == "greenhouse"
    ]
    assert source_inserts == []


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
