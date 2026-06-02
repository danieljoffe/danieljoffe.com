"""Tests for the Phase 2 score-and-persist helper.

Mocks ``derive_job_fit`` to assert:
- LLM success: scores row gets UPDATE with score + axis_scores +
  fit_reasoning + scoring_status; cost log entry recorded.
- LLM failure: returns None, no DB update, no cost log (we didn't
  spend tokens).
- DB persist failure after successful LLM call: still returns None
  but the cost log entry WAS recorded (we did spend the tokens, so
  the daily cap should account for them).
"""

from __future__ import annotations

from datetime import UTC, datetime
from unittest.mock import MagicMock

import pytest

from app.models.experience import OptimizedPayload
from app.models.targets import (
    CategoryProfile,
    JobTarget,
    ScoringProfile,
    SeniorityProfile,
)
from app.services.fit.job_fit import AxisScores, JobFitResult
from app.services.fit.score_persistence import score_with_phase2_and_persist


def _target() -> JobTarget:
    return JobTarget(
        id="t-1",
        label="Staff Frontend Engineer",
        scoring_profile=ScoringProfile(
            categories={"core_skills": CategoryProfile(keywords={"x": 1}, weight=2.0)},
            seniority=SeniorityProfile(signals=["staff"]),
        ),
        is_active=True,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )


def _payload() -> OptimizedPayload:
    return OptimizedPayload(summary="...", roles=[], skills=[], outcomes=[])


def _fake_fit() -> JobFitResult:
    return JobFitResult(
        fit_score=82,
        axes=AxisScores(
            title_fit=95, skills_fit=80, seniority_fit=85, domain_fit=70
        ),
        reasoning="Strong title + skills match; missing e-commerce domain.",
    )


@pytest.mark.asyncio
async def test_success_updates_scores_row_with_full_phase2_payload(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Happy path: LLM returns a fit, cost is logged, scores row UPDATE
    carries the four Phase 2 fields (score, axis_scores, fit_reasoning,
    scoring_status='complete')."""
    supabase = MagicMock()
    llm = MagicMock()

    async def fake_derive(*args: object, **kwargs: object) -> object:
        return (_fake_fit(), MagicMock())

    cost_calls: list[dict[str, object]] = []

    def fake_cost(supabase, *, user_id, purpose, result, metadata=None) -> object:
        cost_calls.append(
            {"purpose": purpose, "metadata": metadata, "user_id": user_id}
        )
        return MagicMock()

    monkeypatch.setattr(
        "app.services.fit.score_persistence.derive_job_fit", fake_derive
    )
    monkeypatch.setattr(
        "app.services.fit.score_persistence.record_llm_cost", fake_cost
    )

    result = await score_with_phase2_and_persist(
        supabase,
        llm,
        payload=_payload(),
        target=_target(),
        job_posting_id="job-1",
        title="Senior FE",
        jd_text="JD body",
    )

    assert result is not None
    assert result.fit_score == 82

    # Cost log fired exactly once with the right scoping.
    assert len(cost_calls) == 1
    assert cost_calls[0]["purpose"] == "fit.job"
    assert cost_calls[0]["metadata"] == {
        "target_id": "t-1",
        "job_posting_id": "job-1",
    }

    # UPDATE fired with all four Phase 2 fields.
    update_args = supabase.table.return_value.update.call_args.args[0]
    assert update_args["score"] == 82
    assert update_args["axis_scores"] == {
        "title_fit": 95,
        "skills_fit": 80,
        "seniority_fit": 85,
        "domain_fit": 70,
    }
    assert update_args["fit_reasoning"].startswith("Strong title")
    assert update_args["scoring_status"] == "complete"
    assert "updated_at" in update_args


@pytest.mark.asyncio
async def test_llm_failure_returns_none_and_skips_db_and_cost(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """LLM threw → we didn't spend tokens, so no cost log fires, and the
    scores row stays exactly as Phase 1 (or prior runs) left it."""
    supabase = MagicMock()
    llm = MagicMock()

    async def boom(*args: object, **kwargs: object) -> object:
        raise RuntimeError("anthropic-503")

    cost_calls: list[object] = []
    monkeypatch.setattr(
        "app.services.fit.score_persistence.derive_job_fit", boom
    )
    monkeypatch.setattr(
        "app.services.fit.score_persistence.record_llm_cost",
        lambda *a, **k: cost_calls.append(1),
    )

    result = await score_with_phase2_and_persist(
        supabase,
        llm,
        payload=_payload(),
        target=_target(),
        job_posting_id="job-1",
        title="x",
        jd_text="x",
    )

    assert result is None
    assert cost_calls == []
    supabase.table.return_value.update.assert_not_called()


@pytest.mark.asyncio
async def test_persist_failure_still_records_cost(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """If the DB UPDATE fails AFTER a successful LLM call, we still
    record the cost — we DID spend the tokens. The daily cap counter
    needs to know.
    """
    supabase = MagicMock()
    supabase.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.side_effect = RuntimeError(
        "supabase-503"
    )
    llm = MagicMock()

    async def fake_derive(*args: object, **kwargs: object) -> object:
        return (_fake_fit(), MagicMock())

    cost_calls: list[int] = []
    monkeypatch.setattr(
        "app.services.fit.score_persistence.derive_job_fit", fake_derive
    )
    monkeypatch.setattr(
        "app.services.fit.score_persistence.record_llm_cost",
        lambda *a, **k: cost_calls.append(1),
    )

    result = await score_with_phase2_and_persist(
        supabase,
        llm,
        payload=_payload(),
        target=_target(),
        job_posting_id="job-1",
        title="x",
        jd_text="x",
    )

    assert result is None
    assert cost_calls == [1]
