"""Tests for target-aware scoring v2 (#502).

Covers: score_and_upsert, bulk_score_for_target, get_target_scores,
poller integration, list endpoint overlay, re-score endpoint.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, cast
from unittest.mock import MagicMock

import pytest

from app.models.schemas import JobTargetScore, ScoreBreakdown
from app.models.targets import (
    CategoryProfile,
    DomainProfile,
    JobTarget,
    NegativeProfile,
    ResumeEmphasis,
    ScoringProfile,
    SeniorityProfile,
)
from app.services.target_scoring import (
    bulk_score_for_target,
    get_target_scores,
    score_and_upsert,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


def _target(
    *,
    target_id: str = "target-1",
    core: dict[str, int] | None = None,
) -> JobTarget:
    cats: dict[str, CategoryProfile] = {}
    if core is not None:
        cats["core_skills"] = CategoryProfile(keywords=core, weight=2.0)
    return JobTarget(
        id=target_id,
        user_id=None,
        label="Senior FE",
        scoring_profile=ScoringProfile(
            categories=cats,
            seniority=SeniorityProfile(level="senior", signals=["5+ years"]),
            domain=DomainProfile(signals=["fintech"], weight=0.5),
            negative=NegativeProfile(keywords=["junior"], weight=-10.0),
        ),
        resume_emphasis=ResumeEmphasis(),
        is_active=True,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )


def _upserted_score_row(
    *,
    score: int = 70,
    job_posting_id: str = "job-1",
    target_id: str = "target-1",
) -> dict[str, Any]:
    return {
        "id": "score-1",
        "job_posting_id": job_posting_id,
        "target_id": target_id,
        "score": score,
        "score_breakdown": ScoreBreakdown(
            role_titles=0, technologies=12.0, domain_skills=0,
            seniority_signals=0, negative=0,
        ).model_dump(),
        "matched_keywords": ["React", "TypeScript"],
        "excluded": False,
        "created_at": datetime.now(UTC).isoformat(),
        "updated_at": datetime.now(UTC).isoformat(),
    }


def _make_supabase_mock(
    *,
    upsert_data: list[dict[str, Any]] | None = None,
    select_data: list[dict[str, Any]] | None = None,
) -> MagicMock:
    supabase = MagicMock()
    # upsert chain
    supabase.table.return_value.upsert.return_value.execute.return_value.data = (
        upsert_data or []
    )
    # select chain (for get_target_scores / bulk_score_for_target)
    supabase.table.return_value.select.return_value.eq.return_value.in_.return_value.execute.return_value.data = (
        select_data or []
    )
    supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = (
        select_data or []
    )
    # For bulk_score_for_target: range query on job_postings
    supabase.table.return_value.select.return_value.range.return_value.execute.return_value.data = (
        select_data or []
    )
    return supabase


# ---------------------------------------------------------------------------
# score_and_upsert
# ---------------------------------------------------------------------------


def test_score_and_upsert_calls_upsert_with_correct_shape() -> None:
    row = _upserted_score_row()
    supabase = _make_supabase_mock(upsert_data=[row])
    target = _target(core={"React": 3, "TypeScript": 3})

    result = score_and_upsert(
        supabase,
        job_posting_id="job-1",
        title="Senior Frontend Engineer",
        description_html="<p>React and TypeScript required.</p>",
        target=target,
    )

    assert result.job_posting_id == "job-1"
    assert result.target_id == "target-1"
    # Verify upsert was called on the right table
    supabase.table.assert_any_call("job_target_scores")


def test_score_and_upsert_raises_on_empty_response() -> None:
    supabase = _make_supabase_mock(upsert_data=[])
    target = _target(core={"React": 3})

    with pytest.raises(RuntimeError, match="Failed to upsert"):
        score_and_upsert(
            supabase,
            job_posting_id="job-1",
            title="Engineer",
            description_html="<p>React.</p>",
            target=target,
        )


# ---------------------------------------------------------------------------
# bulk_score_for_target
# ---------------------------------------------------------------------------


def test_bulk_score_for_target_scores_all_jobs() -> None:
    jobs = [
        {"id": "job-1", "title": "Senior FE", "description_html": "<p>React</p>"},
        {"id": "job-2", "title": "Staff FE", "description_html": "<p>TypeScript</p>"},
    ]
    upsert_rows = [
        _upserted_score_row(job_posting_id="job-1"),
        _upserted_score_row(job_posting_id="job-2"),
    ]

    supabase = MagicMock()
    # First call to range returns jobs, second returns empty (end of pagination)
    supabase.table.return_value.select.return_value.range.return_value.execute.return_value.data = jobs
    # After first batch, return empty to stop pagination
    call_count = {"n": 0}
    original_range = supabase.table.return_value.select.return_value.range

    def range_side_effect(*args: Any, **kwargs: Any) -> MagicMock:
        call_count["n"] += 1
        mock = MagicMock()
        if call_count["n"] == 1:
            mock.execute.return_value.data = jobs
        else:
            mock.execute.return_value.data = []
        return mock

    supabase.table.return_value.select.return_value.range.side_effect = range_side_effect
    supabase.table.return_value.upsert.return_value.execute.return_value.data = upsert_rows

    target = _target(core={"React": 3, "TypeScript": 3})
    count = bulk_score_for_target(supabase, target)

    assert count == 2


def test_bulk_score_for_target_handles_empty_jobs() -> None:
    supabase = MagicMock()
    supabase.table.return_value.select.return_value.range.return_value.execute.return_value.data = []

    target = _target(core={"React": 3})
    count = bulk_score_for_target(supabase, target)

    assert count == 0


# ---------------------------------------------------------------------------
# get_target_scores
# ---------------------------------------------------------------------------


def test_get_target_scores_returns_dict_keyed_by_job_id() -> None:
    rows = [
        _upserted_score_row(job_posting_id="job-1"),
        _upserted_score_row(job_posting_id="job-2"),
    ]
    supabase = _make_supabase_mock(select_data=rows)

    scores = get_target_scores(supabase, "target-1", ["job-1", "job-2"])

    assert "job-1" in scores
    assert "job-2" in scores
    assert scores["job-1"].score == 70


def test_get_target_scores_returns_empty_dict_when_no_scores() -> None:
    supabase = _make_supabase_mock(select_data=[])

    scores = get_target_scores(supabase, "target-1", ["job-1"])

    assert scores == {}


# ---------------------------------------------------------------------------
# Router: list endpoint with target_id overlay
# ---------------------------------------------------------------------------


def test_list_jobs_without_target_uses_global_score() -> None:
    from fastapi.testclient import TestClient

    from app.dependencies import get_supabase, verify_api_key_or_session
    from app.main import app

    supabase = MagicMock()
    supabase.table.return_value.select.return_value.gte.return_value.eq.return_value.ilike.return_value.order.return_value.range.return_value.execute.return_value = MagicMock(
        data=[{"id": "job-1", "score": 50, "score_breakdown": None}],
        count=1,
    )
    # Also handle without gte/eq/ilike
    supabase.table.return_value.select.return_value.order.return_value.range.return_value.execute.return_value = MagicMock(
        data=[{"id": "job-1", "score": 50, "score_breakdown": None}],
        count=1,
    )

    app.dependency_overrides[get_supabase] = lambda: supabase
    app.dependency_overrides[verify_api_key_or_session] = lambda: "test"

    try:
        tc = TestClient(app)
        resp = tc.get("/jobs")
        assert resp.status_code == 200
        data = resp.json()
        assert data["postings"][0]["score"] == 50
    finally:
        app.dependency_overrides.clear()


def test_list_jobs_with_target_overlays_target_score(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from fastapi.testclient import TestClient

    from app.dependencies import get_supabase, verify_api_key_or_session
    from app.main import app
    from app.routers import jobs as jobs_router

    supabase = MagicMock()
    # list query
    supabase.table.return_value.select.return_value.order.return_value.range.return_value.execute.return_value = MagicMock(
        data=[{"id": "job-1", "score": 50, "score_breakdown": None}],
        count=1,
    )

    # Mock get_target_scores at the router module level
    target_score = JobTargetScore(
        id="ts-1",
        job_posting_id="job-1",
        target_id="target-1",
        score=85,
        score_breakdown=ScoreBreakdown(
            role_titles=0, technologies=12.0, domain_skills=0,
            seniority_signals=0, negative=0,
        ),
        matched_keywords=["React"],
        excluded=False,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    monkeypatch.setattr(
        jobs_router, "get_target_scores",
        lambda *_a, **_kw: {"job-1": target_score},
    )

    app.dependency_overrides[get_supabase] = lambda: supabase
    app.dependency_overrides[verify_api_key_or_session] = lambda: "test"

    try:
        tc = TestClient(app)
        resp = tc.get("/jobs?target_id=target-1")
        assert resp.status_code == 200
        data = resp.json()
        # Score should be overlaid with target score
        assert data["postings"][0]["score"] == 85
    finally:
        app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Router: re-score endpoint
# ---------------------------------------------------------------------------


def test_rescore_endpoint_returns_count(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from fastapi.testclient import TestClient

    from app.dependencies import get_supabase, verify_api_key_or_session
    from app.main import app
    from app.routers import jobs as jobs_router

    target = _target()
    monkeypatch.setattr(jobs_router, "get_target", lambda *_a, **_kw: target)
    monkeypatch.setattr(jobs_router, "bulk_score_for_target", lambda *_a, **_kw: 42)

    supabase = MagicMock()
    app.dependency_overrides[get_supabase] = lambda: supabase
    app.dependency_overrides[verify_api_key_or_session] = lambda: "test"

    try:
        tc = TestClient(app)
        resp = tc.post("/jobs/rescore/target-1")
        assert resp.status_code == 200
        data = resp.json()
        assert data["target_id"] == "target-1"
        assert data["jobs_scored"] == 42
    finally:
        app.dependency_overrides.clear()


def test_rescore_endpoint_missing_target_returns_404(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from fastapi.testclient import TestClient

    from app.dependencies import get_supabase, verify_api_key_or_session
    from app.main import app
    from app.routers import jobs as jobs_router

    monkeypatch.setattr(jobs_router, "get_target", lambda *_a, **_kw: None)

    supabase = MagicMock()
    app.dependency_overrides[get_supabase] = lambda: supabase
    app.dependency_overrides[verify_api_key_or_session] = lambda: "test"

    try:
        tc = TestClient(app)
        resp = tc.post("/jobs/rescore/nonexistent")
        assert resp.status_code == 404
    finally:
        app.dependency_overrides.clear()
