"""Deterministic tests for target matching (#553 / audit F0-E).

Covers normalize/exact/fuzzy/RPC-fallback paths in find_matching_target,
and the user-already-linked exclusion in suggest_and_match.
"""

import json
from datetime import UTC, datetime
from typing import Any
from unittest.mock import MagicMock

import pytest

from app.models.experience import OptimizedPayload
from app.services.llm.mock import MockLLMClient
from app.services.targets import match as match_module
from app.services.targets.match import (
    _normalize_label,
    find_matching_target,
    suggest_and_match,
)
from app.services.targets.suggest import DEFAULT_PURPOSE


def _target_row(
    *, id: str = "t1", label: str = "Senior Frontend Engineer"
) -> dict[str, Any]:
    now = datetime.now(UTC).isoformat()
    return {
        "id": id,
        "label": label,
        "description": None,
        "normalized_label": label.lower().strip(),
        "scoring_profile": {},
        "search_keywords": [],
        "activation_status": "idle",
        "profile_version": 1,
        "is_active": False,
        "created_at": now,
        "updated_at": now,
    }


def _scripted_suggestions() -> str:
    return json.dumps(
        {
            "suggestions": [
                {
                    "label": "Senior Frontend Engineer",
                    "description": "Existing match.",
                    "core_skills": ["React"],
                },
                {
                    "label": "Staff DevOps Engineer",
                    "description": "Brand new direction.",
                    "core_skills": ["Kubernetes"],
                },
            ]
        }
    )


# ---- _normalize_label -------------------------------------------------------


def test_normalize_label_lowercases_and_trims() -> None:
    assert _normalize_label("  Senior Frontend Engineer  ") == "senior frontend engineer"


def test_normalize_label_collapses_whitespace() -> None:
    assert _normalize_label("Senior\t\tFrontend\n  Engineer") == "senior frontend engineer"


# ---- find_matching_target ---------------------------------------------------


def test_find_matching_target_exact_match() -> None:
    supabase = MagicMock()
    chain = (
        supabase.table.return_value.select.return_value.eq.return_value.limit.return_value.execute
    )
    chain.return_value.data = [_target_row(id="t1", label="Senior Frontend Engineer")]

    result = find_matching_target(supabase, "  senior frontend engineer  ")
    assert result is not None
    assert result.id == "t1"


def test_find_matching_target_no_match_returns_none() -> None:
    supabase = MagicMock()
    exact_chain = (
        supabase.table.return_value.select.return_value.eq.return_value.limit.return_value.execute
    )
    exact_chain.return_value.data = []
    supabase.rpc.return_value.execute.return_value.data = []

    assert find_matching_target(supabase, "Some Unique Role") is None


def test_find_matching_target_falls_back_to_rpc() -> None:
    supabase = MagicMock()
    exact_chain = (
        supabase.table.return_value.select.return_value.eq.return_value.limit.return_value.execute
    )
    exact_chain.return_value.data = []
    rpc_chain = supabase.rpc.return_value.execute
    rpc_chain.return_value.data = [_target_row(id="t-fuzzy", label="Sr. Frontend Eng")]

    result = find_matching_target(supabase, "Senior Frontend Engineer")
    assert result is not None
    assert result.id == "t-fuzzy"


def test_find_matching_target_swallows_rpc_failure() -> None:
    """If the trgm RPC isn't installed, the function logs and returns None."""
    supabase = MagicMock()
    exact_chain = (
        supabase.table.return_value.select.return_value.eq.return_value.limit.return_value.execute
    )
    exact_chain.return_value.data = []
    supabase.rpc.return_value.execute.side_effect = RuntimeError("RPC missing")

    assert find_matching_target(supabase, "Some Role") is None


# ---- suggest_and_match ------------------------------------------------------


@pytest.mark.asyncio
async def test_suggest_and_match_excludes_users_existing_targets(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A suggestion that exact-matches a target the user already has is dropped;
    a brand-new suggestion is kept with is_new=True."""
    supabase = MagicMock()

    # Sequence the two find_matching_target calls: first hits t1, second misses.
    exact_chain = (
        supabase.table.return_value.select.return_value.eq.return_value.limit.return_value.execute
    )
    exact_chain.side_effect = [
        MagicMock(data=[_target_row(id="t1", label="Senior Frontend Engineer")]),
        MagicMock(data=[]),
    ]
    supabase.rpc.return_value.execute.return_value.data = []

    # Bypass the supabase chain for get_user_target_ids — it's not the SUT here.
    monkeypatch.setattr(
        match_module, "get_user_target_ids", lambda _s, _u: {"t1"}
    )

    llm = MockLLMClient(scripted={DEFAULT_PURPOSE: _scripted_suggestions()})

    matched, _ = await suggest_and_match(
        supabase, llm, payload=OptimizedPayload(), user_id="user-1"
    )

    assert len(matched.matches) == 1
    assert matched.matches[0].suggestion.label == "Staff DevOps Engineer"
    assert matched.matches[0].is_new is True
    assert matched.matches[0].matched_target is None


@pytest.mark.asyncio
async def test_suggest_and_match_marks_unmatched_suggestions_as_new(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    supabase = MagicMock()
    exact_chain = (
        supabase.table.return_value.select.return_value.eq.return_value.limit.return_value.execute
    )
    exact_chain.return_value.data = []
    supabase.rpc.return_value.execute.return_value.data = []

    monkeypatch.setattr(
        match_module, "get_user_target_ids", lambda _s, _u: set()
    )

    llm = MockLLMClient(scripted={DEFAULT_PURPOSE: _scripted_suggestions()})

    matched, _ = await suggest_and_match(
        supabase, llm, payload=OptimizedPayload(), user_id="user-1"
    )

    assert len(matched.matches) == 2
    assert all(m.is_new for m in matched.matches)
    assert all(m.matched_target is None for m in matched.matches)
