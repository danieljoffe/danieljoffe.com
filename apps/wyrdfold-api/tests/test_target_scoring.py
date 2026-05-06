"""Tests for target-aware scoring v2 (#502).

Covers: score_and_upsert, bulk_score_for_target, get_target_scores,
poller integration, list endpoint overlay, re-score endpoint.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from unittest.mock import MagicMock

import pytest

from app.models.schemas import ScoreBreakdown
from app.models.targets import (
    CategoryProfile,
    DomainProfile,
    JobTarget,
    NegativeProfile,
    ScoringProfile,
    SeniorityProfile,
)
from app.services.target_scoring import (
    bulk_score_for_target,
    get_target_scores,
    score_and_upsert,
)

_BATCH_UPDATE_PATH = "app.services.target_scoring.batch_update_global_scores"

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
        label="Senior FE",
        scoring_profile=ScoringProfile(
            categories=cats,
            seniority=SeniorityProfile(level="senior", signals=["5+ years"]),
            domain=DomainProfile(signals=["fintech"], weight=0.5),
            negative=NegativeProfile(keywords=["junior"], weight=-10.0),
        ),
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
    # For bulk_score_for_target: range query on jobs
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
    supabase.table.assert_any_call("scores")


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


def test_bulk_score_for_target_scores_stage1_jobs(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """bulk_score_for_target only scores jobs with existing target score rows."""
    monkeypatch.setattr(_BATCH_UPDATE_PATH, MagicMock())

    # Stage 1 score rows (existing matches for this target)
    jts_rows = [
        {"job_posting_id": "job-1"},
        {"job_posting_id": "job-2"},
    ]
    jobs = [
        {"id": "job-1", "title": "Senior FE", "description_html": "<p>React</p>"},
        {"id": "job-2", "title": "Staff FE", "description_html": "<p>TypeScript</p>"},
    ]
    upsert_rows = [
        _upserted_score_row(job_posting_id="job-1"),
        _upserted_score_row(job_posting_id="job-2"),
    ]

    supabase = MagicMock()

    range_calls = {"n": 0}

    def range_side_effect(*args: Any, **kwargs: Any) -> MagicMock:
        range_calls["n"] += 1
        mock = MagicMock()
        if range_calls["n"] == 1:
            mock.execute.return_value.data = jts_rows
        else:
            mock.execute.return_value.data = []
        return mock

    # Chain: .select().eq().lt().range()
    supabase.table.return_value.select.return_value.eq.return_value.lt.return_value.range.side_effect = (
        range_side_effect
    )
    supabase.table.return_value.select.return_value.in_.return_value.execute.return_value.data = (
        jobs
    )
    supabase.table.return_value.upsert.return_value.execute.return_value.data = upsert_rows

    target = _target(core={"React": 3, "TypeScript": 3})
    count = bulk_score_for_target(supabase, target)

    assert count == 2


def test_bulk_score_for_target_handles_no_stale_jobs() -> None:
    """Returns 0 when no jobs have stale scores for this target."""
    supabase = MagicMock()
    # No stale score rows (chain: .select().eq().lt().range())
    supabase.table.return_value.select.return_value.eq.return_value.lt.return_value.range.return_value.execute.return_value.data = []

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


def test_list_jobs_without_target_returns_global_view(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Global view queries jobs directly with global scores."""
    from fastapi.testclient import TestClient

    from app.dependencies import (
        get_current_user_id_optional,
        get_supabase,
        verify_api_key_or_jwt,
    )
    from app.main import app

    def _fluent_mock(data: list[dict]) -> MagicMock:
        m = MagicMock()
        m.execute.return_value = MagicMock(data=data, count=len(data))
        for method in ("select", "eq", "gte", "in_", "ilike", "order", "range"):
            getattr(m, method).return_value = m
        return m

    jp_mock = _fluent_mock([
        {
            "id": "job-1",
            "score": 50,
            "score_breakdown": None,
            "title": "Engineer",
            "company_name": "Acme",
            "created_at": "2026-01-01T00:00:00Z",
        }
    ])

    supabase = MagicMock()
    supabase.table.return_value = jp_mock

    app.dependency_overrides[get_supabase] = lambda: supabase
    app.dependency_overrides[verify_api_key_or_jwt] = lambda: "test"
    app.dependency_overrides[get_current_user_id_optional] = lambda: None

    try:
        tc = TestClient(app)
        resp = tc.get("/jobs")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["postings"]) == 1
        # Global view preserves the global score
        assert data["postings"][0]["score"] == 50
    finally:
        app.dependency_overrides.clear()


def test_list_jobs_with_target_overlays_target_score(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from fastapi.testclient import TestClient

    from app.dependencies import (
        get_current_user_id_optional,
        get_supabase,
        verify_api_key_or_jwt,
    )
    from app.main import app

    def _fluent_mock(data: list[dict]) -> MagicMock:
        """Mock that chains any query method and returns data on .execute()."""
        m = MagicMock()
        m.execute.return_value = MagicMock(data=data, count=len(data))
        for method in ("select", "eq", "gte", "in_", "ilike", "order", "range"):
            getattr(m, method).return_value = m
        return m

    ts_mock = _fluent_mock([{
        "job_posting_id": "job-1",
        "score": 85,
        "score_breakdown": {
            "role_titles": 0, "technologies": 12.0, "domain_skills": 0,
            "seniority_signals": 0, "negative": 0,
        },
    }])

    jp_mock = _fluent_mock([{
        "id": "job-1",
        "external_id": "ext-1",
        "source_id": "src-1",
        "title": "Frontend Engineer",
        "company_name": "Acme",
        "location": "Remote",
        "department": None,
        "absolute_url": "https://example.com/job-1",
        "score": 50,
        "score_breakdown": None,
        "status": "new",
        "first_seen_at": None,
        "created_at": "2026-04-26T00:00:00Z",
    }])

    supabase = MagicMock()
    supabase.table.side_effect = (
        lambda name: ts_mock if name == "scores" else jp_mock
    )

    app.dependency_overrides[get_supabase] = lambda: supabase
    app.dependency_overrides[verify_api_key_or_jwt] = lambda: "test"
    app.dependency_overrides[get_current_user_id_optional] = lambda: None

    try:
        tc = TestClient(app)
        resp = tc.get("/jobs?target_id=target-1")
        assert resp.status_code == 200
        data = resp.json()
        # Score should be overlaid with target score (85), not global score (50)
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

    from app.dependencies import get_supabase, verify_api_key_or_jwt
    from app.main import app
    from app.routers import jobs as jobs_router

    target = _target()
    monkeypatch.setattr(jobs_router, "get_target", lambda *_a, **_kw: target)
    monkeypatch.setattr(jobs_router, "bulk_score_for_target", lambda *_a, **_kw: 42)

    supabase = MagicMock()
    app.dependency_overrides[get_supabase] = lambda: supabase
    app.dependency_overrides[verify_api_key_or_jwt] = lambda: "test"

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

    from app.dependencies import get_supabase, verify_api_key_or_jwt
    from app.main import app
    from app.routers import jobs as jobs_router

    monkeypatch.setattr(jobs_router, "get_target", lambda *_a, **_kw: None)

    supabase = MagicMock()
    app.dependency_overrides[get_supabase] = lambda: supabase
    app.dependency_overrides[verify_api_key_or_jwt] = lambda: "test"

    try:
        tc = TestClient(app)
        resp = tc.post("/jobs/rescore/nonexistent")
        assert resp.status_code == 404
    finally:
        app.dependency_overrides.clear()
