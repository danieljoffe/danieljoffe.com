"""Tests for the Phase 2 per-target daily cap.

The cap reads ``llm_costs`` to count how many Phase 2 calls a target
has made since UTC midnight. Tests mock the Supabase call chain and
assert the math + the "refuse on error" semantics.
"""

from __future__ import annotations

from unittest.mock import MagicMock

from app.services.fit.daily_cap import (
    DEFAULT_DAILY_CAP,
    phase2_quota_remaining,
)
from app.services.fit.job_fit import JOB_FIT_PURPOSE


def _supabase_with_count(count: int) -> MagicMock:
    """Build a mock whose Phase 2 cost query returns ``count`` entries."""
    supabase = MagicMock()
    chain = (
        supabase.table.return_value
        .select.return_value
        .eq.return_value
        .eq.return_value
        .gte.return_value
        .limit.return_value
        .execute
    )
    chain.return_value.count = count
    return supabase


def test_quota_remaining_at_zero_used_returns_full_cap() -> None:
    supabase = _supabase_with_count(0)
    assert phase2_quota_remaining(supabase, "t-1") == DEFAULT_DAILY_CAP


def test_quota_remaining_subtracts_used_from_cap() -> None:
    # Used count below the cap (10 since the cost-caps work) so the
    # subtraction is exercised without hitting the zero floor.
    supabase = _supabase_with_count(3)
    assert phase2_quota_remaining(supabase, "t-1") == DEFAULT_DAILY_CAP - 3


def test_quota_remaining_floors_at_zero_when_over_cap() -> None:
    """Defensive: if something blew past the cap (concurrent races,
    backfill scripts), the function returns 0 not a negative number."""
    supabase = _supabase_with_count(DEFAULT_DAILY_CAP + 50)
    assert phase2_quota_remaining(supabase, "t-1") == 0


def test_quota_remaining_honors_custom_cap_arg() -> None:
    supabase = _supabase_with_count(10)
    assert phase2_quota_remaining(supabase, "t-1", cap=20) == 10


def test_quota_remaining_returns_zero_on_db_error() -> None:
    """Refuse to spend rather than risk blowing past the cap.

    A transient Supabase error shouldn't suddenly let us spend an
    unbounded amount on LLM calls; better to defer this poll cycle's
    Phase 2 work than to fail-open.
    """
    supabase = MagicMock()
    supabase.table.return_value.select.side_effect = RuntimeError("boom")
    assert phase2_quota_remaining(supabase, "t-1") == 0


def test_quota_remaining_filters_by_target_and_purpose() -> None:
    """Sanity that the query targets the right scoping. We don't
    want a different target's Phase 2 spend to deplete this target's
    quota.
    """
    supabase = _supabase_with_count(5)
    phase2_quota_remaining(supabase, "t-1")
    # First .eq() chains in: ``.eq("purpose", JOB_FIT_PURPOSE)``.
    first_eq = supabase.table.return_value.select.return_value.eq.call_args
    assert first_eq.args[0] == "purpose"
    assert first_eq.args[1] == JOB_FIT_PURPOSE
    # Second .eq() filters by target_id via the metadata JSONB selector.
    second_eq = supabase.table.return_value.select.return_value.eq.return_value.eq.call_args
    assert second_eq.args[0] == "metadata->>target_id"
    assert second_eq.args[1] == "t-1"
