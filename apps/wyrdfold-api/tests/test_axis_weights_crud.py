"""Tests for the axis-weights CRUD helpers (PR E follow-up).

Covers ``set_user_target_axis_weights`` and ``undo_user_target_axis_weights``
in app.services.targets.crud — the snapshot-then-update + swap semantics
that back the PATCH / DELETE / POST-undo endpoints.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from unittest.mock import MagicMock

from app.models.targets import AxisWeights
from app.services.targets import crud


def _row(
    *,
    axis_weights: dict[str, float] | None = None,
    axis_weights_previous: dict[str, float] | None = None,
) -> dict[str, Any]:
    now = datetime.now(UTC).isoformat()
    return {
        "id": "ut-1",
        "user_id": "user-1",
        "target_id": "target-1",
        "is_active": True,
        "fit_score": None,
        "fit_score_reasoning": None,
        "axis_weights": axis_weights,
        "axis_weights_previous": axis_weights_previous,
        "created_at": now,
        "updated_at": now,
    }


def _wire_select(supabase: MagicMock, rows: list[dict[str, Any]]) -> None:
    """Mock the 3-eq chain used by ``get_user_target`` (table-select-eq-eq)."""
    chain = (
        supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute
    )
    chain.return_value.data = rows


def _wire_update(supabase: MagicMock, rows: list[dict[str, Any]]) -> None:
    chain = (
        supabase.table.return_value.update.return_value.eq.return_value.eq.return_value.execute
    )
    chain.return_value.data = rows


# ---- set_user_target_axis_weights ----------------------------------------


def test_set_axis_weights_snapshots_prior_into_previous() -> None:
    """The PATCH semantics: snapshot the *current* axis_weights into
    axis_weights_previous before overwriting. This is what makes the UI's
    "Undo last change" button a one-click revert."""
    prior = {
        "title_fit": 0.4,
        "skills_fit": 0.2,
        "seniority_fit": 0.2,
        "domain_fit": 0.2,
    }
    new = AxisWeights(
        title_fit=0.1, skills_fit=0.4, seniority_fit=0.4, domain_fit=0.1
    )

    supabase = MagicMock()
    _wire_select(supabase, [_row(axis_weights=prior)])
    _wire_update(
        supabase,
        [_row(axis_weights=new.model_dump(), axis_weights_previous=prior)],
    )

    result = crud.set_user_target_axis_weights(
        supabase, user_id="user-1", target_id="target-1", weights=new
    )

    payload = supabase.table.return_value.update.call_args.args[0]
    assert payload["axis_weights"] == new.model_dump()
    assert payload["axis_weights_previous"] == prior
    assert result is not None
    assert result.axis_weights == new


def test_set_axis_weights_to_none_resets_and_still_snapshots() -> None:
    """DELETE semantics: weights=None resets to default (NULL), but the
    snapshot still happens so the user can undo the reset."""
    prior = {
        "title_fit": 0.4,
        "skills_fit": 0.2,
        "seniority_fit": 0.2,
        "domain_fit": 0.2,
    }

    supabase = MagicMock()
    _wire_select(supabase, [_row(axis_weights=prior)])
    _wire_update(
        supabase,
        [_row(axis_weights=None, axis_weights_previous=prior)],
    )

    result = crud.set_user_target_axis_weights(
        supabase, user_id="user-1", target_id="target-1", weights=None
    )

    payload = supabase.table.return_value.update.call_args.args[0]
    assert payload["axis_weights"] is None
    assert payload["axis_weights_previous"] == prior
    assert result is not None
    assert result.axis_weights is None


def test_set_axis_weights_returns_none_when_row_missing() -> None:
    """No (user, target) pairing → return None so the router can 404."""
    supabase = MagicMock()
    _wire_select(supabase, [])

    result = crud.set_user_target_axis_weights(
        supabase,
        user_id="user-1",
        target_id="missing",
        weights=AxisWeights(),
    )

    assert result is None
    supabase.table.return_value.update.assert_not_called()


# ---- undo_user_target_axis_weights ---------------------------------------


def test_undo_swaps_current_and_previous() -> None:
    """The two columns get swapped: previous becomes current, current
    becomes previous. Two consecutive undos return to the starting state."""
    current = {
        "title_fit": 0.1,
        "skills_fit": 0.4,
        "seniority_fit": 0.4,
        "domain_fit": 0.1,
    }
    previous = {
        "title_fit": 0.25,
        "skills_fit": 0.25,
        "seniority_fit": 0.25,
        "domain_fit": 0.25,
    }

    supabase = MagicMock()
    _wire_select(
        supabase,
        [_row(axis_weights=current, axis_weights_previous=previous)],
    )
    _wire_update(
        supabase,
        [_row(axis_weights=previous, axis_weights_previous=current)],
    )

    result = crud.undo_user_target_axis_weights(
        supabase, user_id="user-1", target_id="target-1"
    )

    payload = supabase.table.return_value.update.call_args.args[0]
    assert payload["axis_weights"] == previous
    assert payload["axis_weights_previous"] == current
    assert result is not None


def test_undo_with_no_previous_clears_current() -> None:
    """If there's no previous state, "undo" effectively reverts to
    defaults (current → previous, previous → None). Idempotent re-call
    swaps back. Caller treats this as "nothing useful to undo".
    """
    current = {
        "title_fit": 0.4,
        "skills_fit": 0.2,
        "seniority_fit": 0.2,
        "domain_fit": 0.2,
    }

    supabase = MagicMock()
    _wire_select(
        supabase, [_row(axis_weights=current, axis_weights_previous=None)]
    )
    _wire_update(
        supabase,
        [_row(axis_weights=None, axis_weights_previous=current)],
    )

    result = crud.undo_user_target_axis_weights(
        supabase, user_id="user-1", target_id="target-1"
    )

    payload = supabase.table.return_value.update.call_args.args[0]
    assert payload["axis_weights"] is None
    assert payload["axis_weights_previous"] == current
    assert result is not None
    assert result.axis_weights is None


def test_undo_returns_none_when_row_missing() -> None:
    supabase = MagicMock()
    _wire_select(supabase, [])

    result = crud.undo_user_target_axis_weights(
        supabase, user_id="user-1", target_id="missing"
    )

    assert result is None
    supabase.table.return_value.update.assert_not_called()
