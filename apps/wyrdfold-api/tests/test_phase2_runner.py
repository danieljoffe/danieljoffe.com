"""Tests for Phase 2 orchestration (#6).

Covers the gate / re-grade predicate, progressive batching, and
``run_phase2_for_jobs``: promising-only selection, the daily cap trim,
newest-first ordering, and the graded count. The actual grader
(``score_with_phase2_and_persist``) and the quota counter are stubbed —
this exercises the policy, not the LLM or DB.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
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
from app.services.fit.phase2_runner import (
    PHASE2_BATCH_SIZE,
    PHASE2_FIRST_BATCH,
    _needs_phase2,
    _progressive_batches,
    run_phase2_for_jobs,
)

_RUNNER = "app.services.fit.phase2_runner"


def _target(profile_version: int = 1) -> JobTarget:
    return JobTarget(
        id="t-1",
        label="Staff Frontend Engineer",
        scoring_profile=ScoringProfile(
            categories={"core": CategoryProfile(keywords={"x": 1}, weight=2.0)},
            seniority=SeniorityProfile(signals=["staff"]),
        ),
        profile_version=profile_version,
        is_active=True,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )


def _payload() -> OptimizedPayload:
    return OptimizedPayload(summary="...", roles=[], skills=[], outcomes=[])


def _fit() -> JobFitResult:
    return JobFitResult(
        fit_score=82,
        axes=AxisScores(title_fit=90, skills_fit=80, seniority_fit=85, domain_fit=70),
        reasoning="ok",
    )


# ---- _needs_phase2 ---------------------------------------------------------


def test_needs_phase2_requires_promising_true() -> None:
    # Not promising / unknown → never a candidate.
    assert _needs_phase2(None, "stage2", 1, 1) is False
    assert _needs_phase2(False, "stage2", 1, 1) is False
    # Promising + not yet finished → candidate.
    assert _needs_phase2(True, "stage2", 1, 1) is True


def test_needs_phase2_skips_already_current() -> None:
    # Complete at the current version → skip (re-grade contract).
    assert _needs_phase2(True, "complete", 2, 2) is False
    assert _needs_phase2(True, "complete", 3, 2) is False


def test_needs_phase2_regrades_stale_complete() -> None:
    # Complete but at an older profile version → re-grade.
    assert _needs_phase2(True, "complete", 1, 2) is True


# ---- _progressive_batches --------------------------------------------------


def test_progressive_batches_small_set_single_batch() -> None:
    assert _progressive_batches(["a", "b"], PHASE2_FIRST_BATCH, PHASE2_BATCH_SIZE) == [
        ["a", "b"]
    ]


def test_progressive_batches_first_small_then_large() -> None:
    items = [str(i) for i in range(75)]
    batches = _progressive_batches(items, PHASE2_FIRST_BATCH, PHASE2_BATCH_SIZE)
    # 75 = 20 (first) + 50 + 5.
    assert [len(b) for b in batches] == [20, 50, 5]
    # Order preserved, no drops.
    assert [x for b in batches for x in b] == items


def test_progressive_batches_empty() -> None:
    assert _progressive_batches([], PHASE2_FIRST_BATCH, PHASE2_BATCH_SIZE) == []


# ---- run_phase2_for_jobs ---------------------------------------------------


class _StateChain:
    def __init__(self, rows: list[dict[str, Any]]) -> None:
        self._rows = rows

    def select(self, *_a: Any, **_kw: Any) -> _StateChain:
        return self

    def eq(self, *_a: Any, **_kw: Any) -> _StateChain:
        return self

    def in_(self, *_a: Any, **_kw: Any) -> _StateChain:
        return self

    def execute(self) -> Any:
        return MagicMock(data=self._rows)


def _supabase(state_rows: list[dict[str, Any]]) -> MagicMock:
    sb = MagicMock()
    sb.table.side_effect = lambda name: _StateChain(state_rows)
    return sb


def _patch_grader(monkeypatch: pytest.MonkeyPatch) -> list[str]:
    graded: list[str] = []

    async def fake_score(
        _sb: Any, _llm: Any, *, job_posting_id: str, **_kw: Any
    ) -> JobFitResult:
        graded.append(job_posting_id)
        return _fit()

    monkeypatch.setattr(f"{_RUNNER}.score_with_phase2_and_persist", fake_score)
    return graded


def _patch_quota(monkeypatch: pytest.MonkeyPatch, quota: int) -> None:
    monkeypatch.setattr(
        f"{_RUNNER}.phase2_quota_remaining", lambda *_a, **_kw: quota
    )


@pytest.mark.asyncio
async def test_grades_only_promising_pending(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    graded = _patch_grader(monkeypatch)
    _patch_quota(monkeypatch, 100)
    rows = [
        {"job_posting_id": "j-yes", "promising": True, "scoring_status": "stage2",
         "scored_profile_version": 1},
        {"job_posting_id": "j-no-prom", "promising": False, "scoring_status": "stage2",
         "scored_profile_version": 1},
        {"job_posting_id": "j-done", "promising": True, "scoring_status": "complete",
         "scored_profile_version": 1},
        # No scores row at all for j-missing (Phase 1 dropped it).
    ]
    jobs = [
        {"id": "j-yes", "title": "FE", "description_html": "<p>x</p>"},
        {"id": "j-no-prom", "title": "PM", "description_html": ""},
        {"id": "j-done", "title": "FE2", "description_html": ""},
        {"id": "j-missing", "title": "??", "description_html": ""},
    ]

    n = await run_phase2_for_jobs(
        _supabase(rows), MagicMock(), target=_target(1), payload=_payload(), jobs=jobs
    )

    assert n == 1
    assert graded == ["j-yes"]


@pytest.mark.asyncio
async def test_daily_cap_trims_to_quota_newest_first(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    graded = _patch_grader(monkeypatch)
    _patch_quota(monkeypatch, 2)  # only two grades left today
    rows = [
        {"job_posting_id": f"j{i}", "promising": True, "scoring_status": "stage2",
         "scored_profile_version": 1}
        for i in range(4)
    ]
    # j3 newest, j0 oldest — cap should pick the two freshest.
    jobs = [
        {"id": "j0", "title": "a", "description_html": "", "first_seen_at": "2026-01-01T00:00:00+00:00"},
        {"id": "j1", "title": "b", "description_html": "", "first_seen_at": "2026-02-01T00:00:00+00:00"},
        {"id": "j2", "title": "c", "description_html": "", "first_seen_at": "2026-03-01T00:00:00+00:00"},
        {"id": "j3", "title": "d", "description_html": "", "first_seen_at": "2026-04-01T00:00:00+00:00"},
    ]

    n = await run_phase2_for_jobs(
        _supabase(rows), MagicMock(), target=_target(1), payload=_payload(), jobs=jobs
    )

    assert n == 2
    assert set(graded) == {"j3", "j2"}


@pytest.mark.asyncio
async def test_zero_quota_grades_nothing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    graded = _patch_grader(monkeypatch)
    _patch_quota(monkeypatch, 0)
    rows = [
        {"job_posting_id": "j0", "promising": True, "scoring_status": "stage2",
         "scored_profile_version": 1}
    ]
    jobs = [{"id": "j0", "title": "a", "description_html": ""}]

    n = await run_phase2_for_jobs(
        _supabase(rows), MagicMock(), target=_target(1), payload=_payload(), jobs=jobs
    )

    assert n == 0
    assert graded == []


@pytest.mark.asyncio
async def test_empty_jobs_short_circuits(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    graded = _patch_grader(monkeypatch)
    # Quota counter must not even be consulted on empty input.
    monkeypatch.setattr(
        f"{_RUNNER}.phase2_quota_remaining",
        lambda *_a, **_kw: (_ for _ in ()).throw(AssertionError("called")),
    )
    n = await run_phase2_for_jobs(
        MagicMock(), MagicMock(), target=_target(1), payload=_payload(), jobs=[]
    )
    assert n == 0
    assert graded == []
