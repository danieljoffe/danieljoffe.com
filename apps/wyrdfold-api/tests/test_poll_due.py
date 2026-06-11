"""Tests for the due-source filter and the cron-driven poll endpoint."""

from datetime import UTC, datetime, timedelta
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.poller import (
    DEFAULT_POLL_INTERVAL_MINUTES,
    filter_due_sources,
    poll_due_sources,
)


def _src(
    *,
    last_polled_at: str | None = None,
    poll_interval_minutes: int | None = 240,
    enabled: bool = True,
    company: str = "Test Co",
) -> dict[str, Any]:
    return {
        "id": f"src-{company}",
        "company_name": company,
        "board_token": company.lower(),
        "provider": "greenhouse",
        "enabled": enabled,
        "last_polled_at": last_polled_at,
        "poll_interval_minutes": poll_interval_minutes,
    }


def test_never_polled_is_due() -> None:
    src = _src(last_polled_at=None)
    assert filter_due_sources([src]) == [src]


def test_recently_polled_is_not_due() -> None:
    just_now = datetime.now(UTC).isoformat()
    src = _src(last_polled_at=just_now, poll_interval_minutes=240)
    assert filter_due_sources([src]) == []


def test_polled_past_interval_is_due() -> None:
    long_ago = (datetime.now(UTC) - timedelta(hours=5)).isoformat()
    src = _src(last_polled_at=long_ago, poll_interval_minutes=240)
    assert filter_due_sources([src]) == [src]


def test_per_source_interval_honored() -> None:
    """A source with a tight 30-min interval should be due after 35 min,
    while a 4-hour source should not."""
    thirty_five_min_ago = (datetime.now(UTC) - timedelta(minutes=35)).isoformat()
    fast = _src(
        last_polled_at=thirty_five_min_ago,
        poll_interval_minutes=30,
        company="Fast",
    )
    slow = _src(
        last_polled_at=thirty_five_min_ago,
        poll_interval_minutes=240,
        company="Slow",
    )
    due = filter_due_sources([fast, slow])
    assert due == [fast]


def test_null_interval_falls_back_to_default() -> None:
    """Forward-compat: rows that predate the interval column shouldn't
    silently never get polled."""
    long_ago = (
        datetime.now(UTC) - timedelta(minutes=DEFAULT_POLL_INTERVAL_MINUTES + 5)
    ).isoformat()
    src = _src(last_polled_at=long_ago, poll_interval_minutes=None)
    assert filter_due_sources([src]) == [src]


def test_unparseable_timestamp_treated_as_never_polled() -> None:
    """A garbage timestamp shouldn't cause a row to be skipped forever."""
    src = _src(last_polled_at="not-a-date", poll_interval_minutes=60)
    assert filter_due_sources([src]) == [src]


def test_z_suffix_iso_timestamp_parses() -> None:
    """Supabase returns ISO timestamps with a 'Z' suffix; ensure we
    handle both 'Z' and '+00:00' forms identically."""
    long_ago = "2020-01-01T00:00:00Z"
    src = _src(last_polled_at=long_ago, poll_interval_minutes=60)
    assert filter_due_sources([src]) == [src]


# ---- end-to-end: poll_due_sources with mocked supabase ---------------------


def _supabase_returning(rows: list[dict[str, Any]]) -> MagicMock:
    """Build a Supabase-table-builder mock that returns ``rows`` from
    .select(...).eq(...).execute(). Only the chain used by
    poll_due_sources is stubbed — everything else stays a MagicMock."""
    table = MagicMock()
    select = MagicMock()
    eq = MagicMock()
    response = MagicMock()
    response.data = rows
    eq.execute.return_value = response
    select.eq.return_value = eq
    table.select.return_value = select

    supabase = MagicMock()
    supabase.table.return_value = table
    return supabase


@pytest.mark.asyncio
async def test_poll_due_sources_skips_when_nothing_due() -> None:
    just_now = datetime.now(UTC).isoformat()
    supabase = _supabase_returning([_src(last_polled_at=just_now, poll_interval_minutes=240)])
    with (
        patch("app.services.poller.get_latest_optimized") as get_opt,
        patch("app.services.poller._poll_one_source") as poll_one,
    ):
        get_opt.return_value = None
        result = await poll_due_sources(supabase)

    assert result.sources_polled == 0
    poll_one.assert_not_called()


@pytest.mark.asyncio
async def test_poll_due_sources_polls_only_due_rows() -> None:
    long_ago = (datetime.now(UTC) - timedelta(hours=5)).isoformat()
    just_now = datetime.now(UTC).isoformat()

    due = _src(last_polled_at=long_ago, poll_interval_minutes=240, company="Due Co")
    fresh = _src(last_polled_at=just_now, poll_interval_minutes=240, company="Fresh Co")
    supabase = _supabase_returning([due, fresh])

    with (
        patch("app.services.poller.get_latest_optimized") as get_opt,
        # Cycle-level prefetch — irrelevant to the due-filter under test.
        patch("app.services.poller.get_active_target", return_value=[]),
        patch("app.services.poller._poll_one_source", new_callable=AsyncMock) as poll_one,
    ):
        get_opt.return_value = None
        poll_one.return_value = {
            "polled": True,
            "new": 2,
            "updated": 1,
            "archived": 0,
            "error": None,
        }
        result = await poll_due_sources(supabase)

    assert poll_one.await_count == 1
    polled_source = poll_one.await_args.args[0]
    assert polled_source["company_name"] == "Due Co"
    assert result.sources_polled == 1
    assert result.new_jobs == 2
    assert result.updated_jobs == 1


@pytest.mark.asyncio
async def test_poll_due_sources_aggregates_errors() -> None:
    long_ago = (datetime.now(UTC) - timedelta(hours=5)).isoformat()
    supabase = _supabase_returning(
        [
            _src(last_polled_at=long_ago, company="A"),
            _src(last_polled_at=long_ago, company="B"),
        ]
    )

    with (
        patch("app.services.poller.get_latest_optimized") as get_opt,
        # Cycle-level prefetch — irrelevant to the error aggregation under test.
        patch("app.services.poller.get_active_target", return_value=[]),
        patch("app.services.poller._poll_one_source", new_callable=AsyncMock) as poll_one,
    ):
        get_opt.return_value = None
        poll_one.side_effect = [
            {"polled": True, "new": 0, "updated": 0, "archived": 0, "error": None},
            {
                "polled": False,
                "new": 0,
                "updated": 0,
                "archived": 0,
                "error": "B: poll failed",
            },
        ]
        result = await poll_due_sources(supabase)

    assert result.sources_polled == 1
    assert result.errors == ["B: poll failed"]
