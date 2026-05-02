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
