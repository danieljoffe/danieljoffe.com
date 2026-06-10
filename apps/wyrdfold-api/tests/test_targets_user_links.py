"""Tests for shared-targets junction CRUD and fit-score model bounds (#553).

Covers:
  1. set_user_target_inactive deactivates via user_targets (so the trigger
     can sync targets.is_active).
  2. FitScoreResult tolerates reasoning strings up to 1500 chars (the LLM
     occasionally exceeds the original 500 cap, which caused 502s).
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from unittest.mock import MagicMock

import pytest

from app.services.targets import crud
from app.services.targets.fit_score import FitScoreResult


def _user_target_row(
    *,
    user_id: str = "user-1",
    target_id: str = "target-1",
    is_active: bool = True,
    fit_score: int | None = None,
    fit_score_reasoning: str | None = None,
) -> dict[str, Any]:
    now = datetime.now(UTC).isoformat()
    return {
        "id": "ut-1",
        "user_id": user_id,
        "target_id": target_id,
        "is_active": is_active,
        "fit_score": fit_score,
        "fit_score_reasoning": fit_score_reasoning,
        "created_at": now,
        "updated_at": now,
    }


# ---------------------------------------------------------------------------
# (1) Activate / deactivate route through user_targets
# ---------------------------------------------------------------------------


def test_link_user_to_target_writes_is_active_true() -> None:
    supabase = MagicMock()
    supabase.table.return_value.upsert.return_value.execute.return_value.data = [
        _user_target_row(is_active=True)
    ]

    result = crud.link_user_to_target(
        supabase, user_id="user-1", target_id="target-1", is_active=True
    )

    payload = supabase.table.return_value.upsert.call_args.args[0]
    assert payload["is_active"] is True
    assert payload["user_id"] == "user-1"
    assert payload["target_id"] == "target-1"
    assert result.is_active is True


def test_set_user_target_inactive_updates_user_targets_table() -> None:
    supabase = MagicMock()
    update_chain = (
        supabase.table.return_value.update.return_value.eq.return_value.eq.return_value.execute
    )
    update_chain.return_value.data = [_user_target_row(is_active=False)]

    result = crud.set_user_target_inactive(
        supabase, user_id="user-1", target_id="target-1"
    )

    supabase.table.assert_called_with("user_targets")
    update_args = supabase.table.return_value.update.call_args.args[0]
    assert update_args["is_active"] is False
    assert "updated_at" in update_args
    assert result is not None
    assert result.is_active is False


def test_set_user_target_inactive_returns_none_when_no_row() -> None:
    supabase = MagicMock()
    update_chain = (
        supabase.table.return_value.update.return_value.eq.return_value.eq.return_value.execute
    )
    update_chain.return_value.data = []

    result = crud.set_user_target_inactive(
        supabase, user_id="user-1", target_id="missing"
    )

    assert result is None


# ---------------------------------------------------------------------------
# (2) FitScoreResult tolerates long reasoning
# ---------------------------------------------------------------------------


def test_fit_score_result_accepts_reasoning_up_to_1500_chars() -> None:
    long_reasoning = "x" * 1500
    result = FitScoreResult(fit_score=82, reasoning=long_reasoning)
    assert len(result.reasoning) == 1500


def test_fit_score_result_rejects_reasoning_over_1500_chars() -> None:
    with pytest.raises(ValueError):
        FitScoreResult(fit_score=82, reasoning="x" * 1501)


def test_fit_score_result_enforces_score_bounds() -> None:
    with pytest.raises(ValueError):
        FitScoreResult(fit_score=101, reasoning="ok")
    with pytest.raises(ValueError):
        FitScoreResult(fit_score=-1, reasoning="ok")


# ---------------------------------------------------------------------------
# (3) Active-target limit
# ---------------------------------------------------------------------------


def _mock_supabase_for_link(
    *,
    existing_row: dict[str, Any] | None,
    active_count: int,
    max_active_override: int | None = None,
) -> MagicMock:
    """Build a Supabase mock that returns deterministic answers for the
    three reads link_user_to_target performs before its upsert: (1) "is
    this (user, target) pair already linked, and was it active?",
    (2) "how many active links does this user already have?", and
    (3) the per-user ``max_active_targets`` override on user_profiles.
    """
    supabase = MagicMock()
    table = supabase.table.return_value

    # Existing-row check: select().eq().eq().limit().execute()
    existing_chain = table.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute
    existing_chain.return_value.data = [existing_row] if existing_row else []

    # Count check: select().eq().eq().limit().execute() — same chain in
    # MagicMock, so we shim ``.count`` on the same return value.
    existing_chain.return_value.count = active_count

    # Override read: select().eq().execute() — one .eq() shorter, so it's
    # a distinct chain on the mock.
    override_chain = table.select.return_value.eq.return_value.execute
    override_chain.return_value.data = (
        [{"max_active_targets": max_active_override}]
        if max_active_override is not None
        else []
    )

    # Upsert: returns a row that matches what we wrote.
    table.upsert.return_value.execute.return_value.data = [
        _user_target_row(is_active=True)
    ]
    return supabase


def test_link_user_to_target_allows_when_under_limit() -> None:
    # Cap is 1 (cost-caps work) — "under limit" means zero active links.
    supabase = _mock_supabase_for_link(existing_row=None, active_count=0)

    result = crud.link_user_to_target(
        supabase, user_id="user-1", target_id="target-1", is_active=True
    )

    assert result.is_active is True


def test_link_user_to_target_honors_max_active_override() -> None:
    """A per-user ``max_active_targets`` override (the operator's "add
    credits" lever) raises the cap above the global default of 1."""
    supabase = _mock_supabase_for_link(
        existing_row=None, active_count=2, max_active_override=3
    )

    result = crud.link_user_to_target(
        supabase, user_id="user-1", target_id="target-1", is_active=True
    )

    assert result.is_active is True


def test_link_user_to_target_raises_when_at_limit_and_new_target() -> None:
    """At the cap, activating a NEW target raises."""
    supabase = _mock_supabase_for_link(
        existing_row=None,
        active_count=crud.MAX_ACTIVE_TARGETS_PER_USER,
    )

    with pytest.raises(crud.ActiveTargetLimitError) as ex:
        crud.link_user_to_target(
            supabase, user_id="user-1", target_id="new-target", is_active=True
        )
    assert ex.value.current_count == crud.MAX_ACTIVE_TARGETS_PER_USER
    assert ex.value.limit == crud.MAX_ACTIVE_TARGETS_PER_USER
    # And critically: no upsert fired.
    supabase.table.return_value.upsert.assert_not_called()


def test_link_user_to_target_allows_reupsert_of_already_active_row() -> None:
    """At the cap, re-upserting an ALREADY-ACTIVE row is fine — no net
    change. Lets callers refresh ``fit_score`` on the row without
    tripping the limit.
    """
    supabase = _mock_supabase_for_link(
        existing_row=_user_target_row(is_active=True),
        active_count=crud.MAX_ACTIVE_TARGETS_PER_USER,
    )

    # Doesn't raise.
    result = crud.link_user_to_target(
        supabase,
        user_id="user-1",
        target_id="target-1",
        is_active=True,
        fit_score=85,
    )
    assert result is not None
    # Upsert fired as expected.
    supabase.table.return_value.upsert.assert_called_once()


def test_link_user_to_target_with_enforce_active_limit_false_bypasses_cap() -> None:
    """Internal callers (future backfill scripts) can opt out of the
    cap. Defaults to ``True`` so the path remains safe by default.
    """
    supabase = _mock_supabase_for_link(
        existing_row=None,
        active_count=crud.MAX_ACTIVE_TARGETS_PER_USER + 10,
    )

    result = crud.link_user_to_target(
        supabase,
        user_id="user-1",
        target_id="target-1",
        is_active=True,
        enforce_active_limit=False,
    )
    assert result is not None


def test_link_user_to_target_skips_count_when_is_active_false() -> None:
    """Deactivation never trips the cap — we're removing an active
    target, not adding one.
    """
    supabase = MagicMock()
    supabase.table.return_value.upsert.return_value.execute.return_value.data = [
        _user_target_row(is_active=False)
    ]

    result = crud.link_user_to_target(
        supabase, user_id="user-1", target_id="target-1", is_active=False
    )

    assert result.is_active is False
    # The "existing row" / "count" reads never happened — only the
    # upsert. (Verified by checking that .select() wasn't called.)
    supabase.table.return_value.select.assert_not_called()


def test_count_active_for_user_uses_exact_count_head() -> None:
    """``count_active_for_user`` only needs a row count, not the rows
    themselves — verify it asks Supabase for ``count='exact'`` with a
    ``limit(1)`` so we don't ship a payload we don't use.
    """
    supabase = MagicMock()
    chain = supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute
    chain.return_value.count = 3

    n = crud.count_active_for_user(supabase, "user-1")

    assert n == 3
    select_args = supabase.table.return_value.select.call_args
    # First positional arg or 'count' kwarg should signal exact-count semantics.
    assert select_args.kwargs.get("count") == "exact"
