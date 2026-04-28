"""Tests for shared-targets junction CRUD and fit-score model bounds (#553).

Covers the three fix paths from the activate/deactivate + emphasis bugs:
  1. link_user_to_target preserves existing resume_emphasis when not supplied.
  2. set_user_target_inactive deactivates via user_targets (so the trigger
     can sync job_targets.is_active).
  3. FitScoreResult tolerates reasoning strings up to 1500 chars (the LLM
     occasionally exceeds the original 500 cap, which caused 502s).
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from unittest.mock import MagicMock

import pytest

from app.models.targets import ResumeEmphasis
from app.services.targets import crud
from app.services.targets.fit_score import FitScoreResult


def _user_target_row(
    *,
    user_id: str = "user-1",
    target_id: str = "target-1",
    resume_emphasis: dict[str, Any] | None = None,
    is_active: bool = True,
    fit_score: int | None = None,
    fit_score_reasoning: str | None = None,
) -> dict[str, Any]:
    now = datetime.now(UTC).isoformat()
    return {
        "id": "ut-1",
        "user_id": user_id,
        "target_id": target_id,
        "resume_emphasis": resume_emphasis or {},
        "is_active": is_active,
        "fit_score": fit_score,
        "fit_score_reasoning": fit_score_reasoning,
        "created_at": now,
        "updated_at": now,
    }


def _supabase_with_existing_link(existing_row: dict[str, Any] | None) -> MagicMock:
    """Build a mock supabase whose select(...).eq(...).eq(...).execute returns existing_row."""
    supabase = MagicMock()
    select_chain = (
        supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute
    )
    select_chain.return_value.data = [existing_row] if existing_row else []
    return supabase


# ---------------------------------------------------------------------------
# (1) Emphasis preservation on re-link
# ---------------------------------------------------------------------------


def test_link_preserves_existing_emphasis_when_none_supplied() -> None:
    saved_emphasis = {
        "focus_skills": ["GraphQL", "Postgres"],
        "focus_outcomes": ["scaled to 10M req/day"],
        "tone": "pragmatic",
    }
    existing = _user_target_row(resume_emphasis=saved_emphasis)
    supabase = _supabase_with_existing_link(existing)
    upserted = _user_target_row(resume_emphasis=saved_emphasis)
    supabase.table.return_value.upsert.return_value.execute.return_value.data = [upserted]

    result = crud.link_user_to_target(
        supabase, user_id="user-1", target_id="target-1", is_active=True
    )

    upsert_call = supabase.table.return_value.upsert.call_args
    payload = upsert_call.args[0]
    assert payload["resume_emphasis"] == saved_emphasis
    assert result.resume_emphasis.focus_skills == ["GraphQL", "Postgres"]


def test_link_writes_empty_emphasis_when_no_existing_row() -> None:
    supabase = _supabase_with_existing_link(None)
    upserted = _user_target_row()
    supabase.table.return_value.upsert.return_value.execute.return_value.data = [upserted]

    crud.link_user_to_target(
        supabase, user_id="user-1", target_id="target-1", is_active=True
    )

    payload = supabase.table.return_value.upsert.call_args.args[0]
    assert payload["resume_emphasis"] == ResumeEmphasis().model_dump()


def test_link_overwrites_emphasis_when_explicitly_supplied() -> None:
    existing = _user_target_row(
        resume_emphasis={"focus_skills": ["old"], "focus_outcomes": [], "tone": None}
    )
    supabase = _supabase_with_existing_link(existing)
    new_emphasis = ResumeEmphasis(focus_skills=["new"])
    upserted = _user_target_row(resume_emphasis=new_emphasis.model_dump())
    supabase.table.return_value.upsert.return_value.execute.return_value.data = [upserted]

    crud.link_user_to_target(
        supabase,
        user_id="user-1",
        target_id="target-1",
        resume_emphasis=new_emphasis,
    )

    payload = supabase.table.return_value.upsert.call_args.args[0]
    assert payload["resume_emphasis"]["focus_skills"] == ["new"]


# ---------------------------------------------------------------------------
# (2) Activate / deactivate route through user_targets
# ---------------------------------------------------------------------------


def test_link_user_to_target_writes_is_active_true() -> None:
    supabase = _supabase_with_existing_link(None)
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
# (3) FitScoreResult tolerates long reasoning
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
