"""Tests for recency decay (#5).

Covers the pure decay math (``compute_recency_multiplier`` /
``compute_recency_score``), the poller-side refresh pass
(``refresh_recency_scores``), and the /jobs two-query ordering when the
``RECENCY_DECAY_ENABLED`` flag is on.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any
from unittest.mock import MagicMock

import pytest

from app.config import settings
from app.routers.jobs import (
    _list_jobs_across_user_targets,
    _list_jobs_for_target_two_query,
)
from app.services.recency import (
    RECENCY_FLOOR,
    compute_recency_multiplier,
    compute_recency_score,
    refresh_recency_scores,
)

# ---- Pure decay math -------------------------------------------------------


def test_multiplier_full_inside_grace_window() -> None:
    assert compute_recency_multiplier(0) == 1.0
    assert compute_recency_multiplier(7) == 1.0


def test_multiplier_decays_after_grace() -> None:
    # Day 8: one day past the 7-day grace → lose 1.5%.
    assert compute_recency_multiplier(8) == pytest.approx(0.985)
    # Day 27: 20 days past grace → lose 30%.
    assert compute_recency_multiplier(27) == pytest.approx(0.70)


def test_multiplier_floors_at_30_percent() -> None:
    # 1 - (age-7)*0.015 = 0.3 → age ≈ 53.7; anything older clamps to the floor.
    assert compute_recency_multiplier(54) == RECENCY_FLOOR
    assert compute_recency_multiplier(365) == RECENCY_FLOOR


def test_multiplier_clamps_negative_age() -> None:
    """Clock skew on a just-ingested row must not exceed full score."""
    assert compute_recency_multiplier(-3) == 1.0


def test_compute_recency_score_disabled_is_identity() -> None:
    # Even a very old posting keeps its raw score when the flag is off.
    assert compute_recency_score(90, age_days=200, enabled=False) == 90


def test_compute_recency_score_enabled_applies_decay() -> None:
    assert compute_recency_score(90, age_days=0, enabled=True) == 90
    # 20 days past grace → 0.70 → round(90 * 0.70) = 63.
    assert compute_recency_score(90, age_days=27, enabled=True) == 63
    # Past the floor → round(90 * 0.30) = 27.
    assert compute_recency_score(90, age_days=400, enabled=True) == 27


# ---- refresh_recency_scores ------------------------------------------------


class _Resp:
    def __init__(self, data: list[dict[str, Any]]) -> None:
        self.data = data


class _TableChain:
    def __init__(self, resp: _Resp) -> None:
        self._resp = resp

    def select(self, *_a: Any, **_kw: Any) -> _TableChain:
        return self

    def in_(self, *_a: Any, **_kw: Any) -> _TableChain:
        return self

    def execute(self) -> _Resp:
        return self._resp


class _RpcChain:
    def __init__(self, sink: list[dict[str, Any]]) -> None:
        self._sink = sink

    def execute(self) -> _Resp:
        return _Resp([])


def _refresh_supabase(
    jobs: list[dict[str, Any]],
    scores: list[dict[str, Any]],
    rpc_calls: list[tuple[str, dict[str, Any]]],
) -> MagicMock:
    sb = MagicMock()
    sb.table.side_effect = lambda name: _TableChain(
        _Resp(jobs if name == "jobs" else scores)
    )

    def _rpc(name: str, params: dict[str, Any]) -> _RpcChain:
        rpc_calls.append((name, params))
        return _RpcChain([])

    sb.rpc.side_effect = _rpc
    return sb


def test_refresh_applies_decay_per_row_when_enabled(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "recency_decay_enabled", True)
    fresh = datetime.now(UTC).isoformat()
    old = (datetime.now(UTC) - timedelta(days=27)).isoformat()
    jobs = [
        {"id": "j-fresh", "first_seen_at": fresh},
        {"id": "j-old", "first_seen_at": old},
    ]
    # Two targets for the old job → two rows, different scores, same age.
    scores = [
        {"id": "s1", "job_posting_id": "j-fresh", "score": 80},
        {"id": "s2", "job_posting_id": "j-old", "score": 90},
        {"id": "s3", "job_posting_id": "j-old", "score": 40},
    ]
    rpc_calls: list[tuple[str, dict[str, Any]]] = []
    sb = _refresh_supabase(jobs, scores, rpc_calls)

    written = refresh_recency_scores(sb, ["j-fresh", "j-old"])

    assert written == 3
    assert len(rpc_calls) == 1
    name, params = rpc_calls[0]
    assert name == "bulk_update_recency_scores"
    by_id = {u["id"]: u["recency_score"] for u in params["p_updates"]}
    assert by_id["s1"] == 80  # fresh → no decay
    assert by_id["s2"] == 63  # round(90 * 0.70)
    assert by_id["s3"] == 28  # round(40 * 0.70)


def test_refresh_mirrors_score_when_disabled(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "recency_decay_enabled", False)
    old = (datetime.now(UTC) - timedelta(days=100)).isoformat()
    jobs = [{"id": "j-old", "first_seen_at": old}]
    scores = [{"id": "s1", "job_posting_id": "j-old", "score": 90}]
    rpc_calls: list[tuple[str, dict[str, Any]]] = []
    sb = _refresh_supabase(jobs, scores, rpc_calls)

    refresh_recency_scores(sb, ["j-old"])

    by_id = {u["id"]: u["recency_score"] for u in rpc_calls[0][1]["p_updates"]}
    assert by_id["s1"] == 90  # flag off → recency mirrors raw score


def test_refresh_noop_on_empty_input() -> None:
    sb = MagicMock()
    assert refresh_recency_scores(sb, []) == 0
    sb.rpc.assert_not_called()


# ---- /jobs ordering by recency_score ---------------------------------------


class _ListResp:
    def __init__(self, data: list[dict[str, Any]], count: int | None = None) -> None:
        self.data = data
        self.count = count


class _ListChain:
    def __init__(self, resp: _ListResp) -> None:
        self._resp = resp

    def select(self, *_a: Any, **_kw: Any) -> _ListChain:
        return self

    def eq(self, *_a: Any, **_kw: Any) -> _ListChain:
        return self

    def in_(self, *_a: Any, **_kw: Any) -> _ListChain:
        return self

    def gte(self, *_a: Any, **_kw: Any) -> _ListChain:
        return self

    def ilike(self, *_a: Any, **_kw: Any) -> _ListChain:
        return self

    def order(self, *_a: Any, **_kw: Any) -> _ListChain:
        return self

    def range(self, *_a: Any, **_kw: Any) -> _ListChain:
        return self

    def execute(self) -> _ListResp:
        return self._resp


def _list_supabase(table_resps: dict[str, _ListResp]) -> MagicMock:
    sb = MagicMock()
    sb.table.side_effect = lambda name: _ListChain(table_resps[name])
    return sb


def test_target_two_query_orders_by_recency_when_enabled(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A high-fit but stale job sorts BELOW a fresher, lower-fit job once
    decay is on — the visible (raw) score still rides along."""
    monkeypatch.setattr(settings, "recency_decay_enabled", True)
    # Rows arrive pre-ordered by recency_score desc (what the .order() on
    # recency_score produces server-side): fresh-70 ranks above stale-95.
    ts_rows = [
        {"job_posting_id": "j-fresh", "score": 70, "recency_score": 70,
         "score_breakdown": {}, "scoring_status": "complete"},
        {"job_posting_id": "j-stale", "score": 95, "recency_score": 48,
         "score_breakdown": {}, "scoring_status": "complete"},
    ]
    postings_storage_order = [
        {"id": "j-stale", "title": "stale high-fit"},
        {"id": "j-fresh", "title": "fresh"},
    ]
    sb = _list_supabase(
        {
            "scores": _ListResp(ts_rows, count=2),
            "jobs": _ListResp(postings_storage_order),
        }
    )

    result = _list_jobs_for_target_two_query(
        sb,
        target_id="t-1",
        offset=0,
        page=1,
        page_size=10,
        sort="score",
        ascending=False,
        min_score=None,
        status=None,
        company=None,
        search=None,
        exclude_terms=[],
        only_terms=[],
    )

    assert [p["id"] for p in result["postings"]] == ["j-fresh", "j-stale"]
    # Displayed score is the raw fit score, not the decayed value.
    assert [p["score"] for p in result["postings"]] == [70, 95]


def test_across_targets_orders_by_recency_when_enabled(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "recency_decay_enabled", True)
    # Location filter active → forces the Python sort path (not the
    # scores-layer slice), exercising the _sort_key recency branch.
    score_rows = [
        {"job_posting_id": "j-fresh", "target_id": "t-1", "score": 70,
         "recency_score": 70, "score_breakdown": {}, "scoring_status": "complete"},
        {"job_posting_id": "j-stale", "target_id": "t-2", "score": 95,
         "recency_score": 48, "score_breakdown": {}, "scoring_status": "complete"},
    ]
    postings = [
        {"id": "j-stale", "title": "stale", "location": "Remote · US"},
        {"id": "j-fresh", "title": "fresh", "location": "Remote · US"},
    ]
    sb = _list_supabase(
        {"scores": _ListResp(score_rows), "jobs": _ListResp(postings)}
    )

    result = _list_jobs_across_user_targets(
        sb,
        user_target_ids={"t-1", "t-2"},
        offset=0,
        page=1,
        page_size=10,
        sort="score",
        ascending=False,
        min_score=None,
        status=None,
        company=None,
        search=None,
        exclude_terms=[],
        only_terms=["remote"],
    )

    assert [p["id"] for p in result["postings"]] == ["j-fresh", "j-stale"]
    assert [p["score"] for p in result["postings"]] == [70, 95]
