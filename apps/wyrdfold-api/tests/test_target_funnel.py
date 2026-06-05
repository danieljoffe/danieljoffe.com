"""Tests for the per-target funnel diagnostics (#845).

Covers the pure helpers + a smoke test of ``compute_target_funnel``
wired against a hand-rolled fake Supabase. The fake routes each
``.table(name).select(...)`` chain to a scripted response — keeping
us off a live DB while still exercising the count → histogram →
response-shape assembly end-to-end.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from typing import Any

import pytest

from app.models.diagnostics import FunnelUserContext
from app.models.targets import (
    CategoryProfile,
    JobTarget,
    ScoringProfile,
    SeniorityProfile,
)
from app.services.diagnostics.funnel import (
    _bucketize,
    _default_floor_from_users,
    _hours_since,
    compute_target_funnel,
)

# ---- Pure helpers ----------------------------------------------------


def test_bucketize_distributes_into_decile_bins() -> None:
    """Edge values land in the bin whose half-open range contains them."""
    buckets = _bucketize([0, 9, 10, 19, 50, 89, 90, 100])
    assert buckets["0-9"] == 2
    assert buckets["10-19"] == 2
    assert buckets["50-59"] == 1
    assert buckets["80-89"] == 1
    # Final bucket is inclusive on the upper bound — 100 is a valid score.
    assert buckets["90-100"] == 2


def test_bucketize_empty_input_gives_zeroed_buckets() -> None:
    buckets = _bucketize([])
    assert sum(buckets.values()) == 0
    assert set(buckets) == {
        "0-9", "10-19", "20-29", "30-39", "40-49",
        "50-59", "60-69", "70-79", "80-89", "90-100",
    }


def test_hours_since_naive_datetime_assumed_utc() -> None:
    """Naive datetimes are coerced to UTC rather than crashing — the DB
    sometimes returns timezone-stripped values depending on driver."""
    one_hour_ago = (datetime.now(UTC) - timedelta(hours=1)).replace(tzinfo=None)
    assert _hours_since(one_hour_ago) == pytest.approx(1.0, abs=0.1)


def test_hours_since_none_returns_none() -> None:
    assert _hours_since(None) is None


def test_default_floor_picks_lowest_across_users() -> None:
    """Most permissive view: a multi-user target's histogram should
    show the floor at whichever user is set to admit the most."""
    users = [
        FunnelUserContext(user_id="a", list_min_score=50, phase2_quota_remaining=0),
        FunnelUserContext(user_id="b", list_min_score=30, phase2_quota_remaining=0),
        FunnelUserContext(user_id="c", list_min_score=None, phase2_quota_remaining=0),
    ]
    assert _default_floor_from_users(users) == 30


def test_default_floor_no_floors_set_falls_to_zero() -> None:
    """If nobody has set list_min_score, treat as 'no floor' so the
    histogram view doesn't accidentally hide rows."""
    users = [
        FunnelUserContext(user_id="a", list_min_score=None, phase2_quota_remaining=0),
    ]
    assert _default_floor_from_users(users) == 0


# ---- Fake Supabase for the end-to-end smoke test --------------------


def _make_target() -> JobTarget:
    return JobTarget(
        id="t-1",
        label="Director of CX Ops",
        normalized_label="director of cx ops",
        scoring_profile=ScoringProfile(
            categories={
                "core_skills": CategoryProfile(
                    keywords={"customer": 3, "ops": 3}, weight=2.0
                ),
            },
            seniority=SeniorityProfile(signals=["director"]),
        ),
        search_keywords=["customer", "ops"],
        is_active=True,
        example_promising_titles=["Director, CX Operations"],
        example_unpromising_titles=["Customer Service Rep"],
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )


class _FakeQuery:
    """Records the columns + filters; returns a scripted response."""

    def __init__(self, table: str, scripted: Any) -> None:
        self._table = table
        self._scripted = scripted
        self._filters: list[tuple[str, str, Any]] = []
        self._count: str | None = None

    def select(self, *_args: Any, count: str | None = None, **_kw: Any) -> _FakeQuery:
        self._count = count
        return self

    def eq(self, col: str, val: Any) -> _FakeQuery:
        self._filters.append(("eq", col, val))
        return self

    def neq(self, col: str, val: Any) -> _FakeQuery:
        self._filters.append(("neq", col, val))
        return self

    def is_(self, col: str, val: Any) -> _FakeQuery:
        self._filters.append(("is", col, val))
        return self

    def order(self, *_a: Any, **_kw: Any) -> _FakeQuery:
        return self

    def limit(self, *_a: Any, **_kw: Any) -> _FakeQuery:
        return self

    def execute(self) -> Any:
        return self._scripted(self._table, self._filters, self._count)


class _FakeSupabase:
    def __init__(self, script: Any) -> None:
        self._script = script

    def table(self, name: str) -> _FakeQuery:
        return _FakeQuery(name, self._script)


def _scripted_response(target: JobTarget) -> Any:
    """Hard-coded responses keyed by (table, filter signature)."""

    def respond(
        table: str, filters: list[tuple[str, str, Any]], count: str | None
    ) -> Any:
        # Targets lookup — single row.
        if table == "targets":
            return SimpleNamespace(
                data=[
                    {
                        "id": target.id,
                        "label": target.label,
                        "description": target.description,
                        "normalized_label": target.normalized_label,
                        "scoring_profile": target.scoring_profile.model_dump(),
                        "search_keywords": target.search_keywords,
                        "activation_status": target.activation_status,
                        "profile_version": target.profile_version,
                        "is_active": target.is_active,
                        "example_promising_titles": target.example_promising_titles,
                        "example_unpromising_titles": target.example_unpromising_titles,
                        "seniority_hint": target.seniority_hint,
                        "domain_hints": target.domain_hints,
                        "created_at": target.created_at.isoformat(),
                        "updated_at": target.updated_at.isoformat(),
                    }
                ],
                count=None,
            )

        if table == "scores":
            fmap = dict((f[1], f[2]) for f in filters)
            # Histogram path returns rows of scores.
            if count is None:
                return SimpleNamespace(
                    data=[{"score": s} for s in [45, 55, 65, 75, 85, 95]],
                    count=None,
                )
            # Counts.
            if fmap.get("scoring_status") == "stage1":
                return SimpleNamespace(data=[], count=20)
            if fmap.get("scoring_status") == "stage2":
                return SimpleNamespace(data=[], count=5)
            if fmap.get("scoring_status") == "complete":
                return SimpleNamespace(data=[], count=2)
            if fmap.get("promising") is True and fmap.get("scoring_status") == "stage1":
                return SimpleNamespace(data=[], count=15)
            if fmap.get("promising") is True and any(
                f[0] == "neq" and f[1] == "scoring_status" for f in filters
            ):
                # graded = promising True AND status != stage1
                return SimpleNamespace(data=[], count=7)
            if fmap.get("promising") is True:
                return SimpleNamespace(data=[], count=22)
            if fmap.get("promising") is False:
                return SimpleNamespace(data=[], count=3)
            if any(f[0] == "is" and f[1] == "promising" for f in filters):
                return SimpleNamespace(data=[], count=2)
            if fmap.get("excluded") is True:
                return SimpleNamespace(data=[], count=4)
            if fmap.get("excluded") is False:
                return SimpleNamespace(data=[], count=23)
            return SimpleNamespace(data=[], count=27)

        if table == "user_targets":
            return SimpleNamespace(
                data=[{"user_id": "u-1", "is_active": True}], count=None
            )

        if table == "user_profiles":
            return SimpleNamespace(
                data=[{"list_min_score": 60}], count=None
            )

        if table == "sources":
            return SimpleNamespace(
                data=[
                    {
                        "id": "s-1",
                        "company_name": "Acme",
                        "provider": "greenhouse",
                        "enabled": True,
                        "last_polled_at": datetime.now(UTC).isoformat(),
                        "job_count": 42,
                    }
                ],
                count=None,
            )

        # llm_costs count for daily-cap query
        if table == "llm_costs":
            return SimpleNamespace(data=[], count=10)

        return SimpleNamespace(data=[], count=0)

    return respond


def test_compute_target_funnel_assembles_full_report(monkeypatch: Any) -> None:
    """End-to-end smoke: a fake supabase + a real target → a full
    ``TargetFunnelResponse`` with the histogram, stages, users, sources."""
    target = _make_target()

    def _fake_get(_sb: Any, target_id: str) -> JobTarget:
        assert target_id == target.id
        return target

    # The funnel's nomenclature path goes via crud.get(target_id). We
    # patch that instead of round-tripping through the fake table call.
    monkeypatch.setattr(
        "app.services.diagnostics.funnel.crud.get", _fake_get
    )

    sb = _FakeSupabase(_scripted_response(target))
    report = compute_target_funnel(sb, target.id)

    assert report.nomenclature.label == "Director of CX Ops"
    assert report.nomenclature.example_promising_titles == [
        "Director, CX Operations"
    ]
    # Histogram bins reflect the scripted scores [45,55,65,75,85,95].
    assert report.scores_histogram.total == 6
    assert report.scores_histogram.max_score == 95
    # floor=60 from user_profiles → 4 scores ≥60 (65,75,85,95).
    assert report.scores_histogram.floor == 60
    assert report.scores_histogram.above_floor == 4
    # User context picked up.
    assert [u.user_id for u in report.users] == ["u-1"]
    assert report.users[0].list_min_score == 60
    # Sources list non-empty (single Acme row).
    assert len(report.sources) == 1
    assert report.sources[0].company_name == "Acme"
    # Pre-DB hint is present and mentions the grep token.
    assert "poll_funnel" in report.pre_db_hint
