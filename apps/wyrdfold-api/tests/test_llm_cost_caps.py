"""Tests for the per-user LLM cost caps (monthly allowance + counters).

Covers the budget windows (monthly), the analysis daily counter, payer
resolution for background work, and the poll-cycle budget gate.
"""

from typing import Any
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.services.llm import budget
from app.services.targets.payers import (
    PayerBudgetGate,
    build_budget_gate,
    resolve_target_payers,
)

# ---- check_user_budget: monthly window --------------------------------------


def _spend_by_window(hour: float, day: float, month: float):
    """Fake cost_log.total_spend keyed on how far back ``since`` reaches."""
    from datetime import UTC, datetime, timedelta

    def _fake(supabase, user_id, since=None):
        now = datetime.now(UTC)
        if since is None:
            return month
        if since >= now - timedelta(hours=2):
            return hour
        if since >= now - timedelta(hours=25):
            return day
        return month

    return _fake


def test_monthly_breach_raises_429(monkeypatch):
    monkeypatch.setattr(
        budget.cost_log, "total_spend", _spend_by_window(0.0, 0.0, 5.0)
    )
    with pytest.raises(HTTPException) as exc:
        budget.check_user_budget(
            MagicMock(),
            user_id="u-1",
            daily_limit_usd=0,
            hourly_limit_usd=0,
            monthly_limit_usd=5.0,
        )
    assert exc.value.status_code == 429
    assert exc.value.detail["scope"] == "monthly"
    assert exc.value.detail["code"] == "llm_budget_exceeded"


def test_monthly_zero_disables(monkeypatch):
    monkeypatch.setattr(
        budget.cost_log, "total_spend", _spend_by_window(0.0, 0.0, 999.0)
    )
    budget.check_user_budget(
        MagicMock(),
        user_id="u-1",
        daily_limit_usd=0,
        hourly_limit_usd=0,
        monthly_limit_usd=0,
    )  # must not raise


def test_under_monthly_cap_passes(monkeypatch):
    monkeypatch.setattr(
        budget.cost_log, "total_spend", _spend_by_window(0.0, 0.0, 4.99)
    )
    budget.check_user_budget(
        MagicMock(),
        user_id="u-1",
        daily_limit_usd=0,
        hourly_limit_usd=0,
        monthly_limit_usd=5.0,
    )  # must not raise


def test_hourly_trips_before_monthly(monkeypatch):
    """Burst protection: the smaller window raises first."""
    monkeypatch.setattr(
        budget.cost_log, "total_spend", _spend_by_window(1.0, 1.0, 5.0)
    )
    with pytest.raises(HTTPException) as exc:
        budget.check_user_budget(
            MagicMock(),
            user_id="u-1",
            daily_limit_usd=5.0,
            hourly_limit_usd=1.0,
            monthly_limit_usd=5.0,
        )
    assert exc.value.detail["scope"] == "hourly"


# ---- effective_monthly_cap ---------------------------------------------------


def _supabase_profile(rows: list[dict[str, Any]]) -> MagicMock:
    supabase = MagicMock()
    chain = supabase.table.return_value.select.return_value.eq.return_value.execute
    chain.return_value.data = rows
    return supabase


def test_effective_monthly_cap_default_when_no_profile():
    sb = _supabase_profile([])
    assert budget.effective_monthly_cap(sb, user_id="u-1", default_usd=5.0) == 5.0


def test_effective_monthly_cap_default_when_override_null():
    sb = _supabase_profile([{"llm_monthly_budget_usd": None}])
    assert budget.effective_monthly_cap(sb, user_id="u-1", default_usd=5.0) == 5.0


def test_effective_monthly_cap_honors_override():
    sb = _supabase_profile([{"llm_monthly_budget_usd": 25}])
    assert budget.effective_monthly_cap(sb, user_id="u-1", default_usd=5.0) == 25.0


# ---- check_daily_count (deep-analysis counter) -------------------------------


def _supabase_count(count: int) -> MagicMock:
    supabase = MagicMock()
    chain = (
        supabase.table.return_value.select.return_value.eq.return_value
        .eq.return_value.gte.return_value.execute
    )
    chain.return_value.count = count
    return supabase


def test_daily_count_under_limit_passes():
    budget.check_daily_count(
        _supabase_count(19), user_id="u-1", purpose="job_analysis", limit=20
    )  # must not raise


def test_daily_count_at_limit_raises_429():
    with pytest.raises(HTTPException) as exc:
        budget.check_daily_count(
            _supabase_count(20), user_id="u-1", purpose="job_analysis", limit=20
        )
    assert exc.value.status_code == 429
    assert exc.value.detail["code"] == "analysis_daily_limit"
    assert exc.value.detail["limit"] == 20
    assert exc.value.detail["used"] == 20


def test_daily_count_zero_limit_disables():
    budget.check_daily_count(
        _supabase_count(10_000), user_id="u-1", purpose="job_analysis", limit=0
    )  # must not raise


# ---- resolve_target_payers ----------------------------------------------------


def _supabase_user_targets(rows: list[dict[str, Any]]) -> MagicMock:
    supabase = MagicMock()
    chain = (
        supabase.table.return_value.select.return_value.eq.return_value
        .in_.return_value.order.return_value.order.return_value.execute
    )
    chain.return_value.data = rows
    return supabase


def test_resolve_payers_earliest_active_link_wins():
    # Rows arrive ordered by (created_at, user_id) — the query's contract.
    sb = _supabase_user_targets(
        [
            {"target_id": "t-1", "user_id": "u-early", "created_at": "2026-01-01"},
            {"target_id": "t-1", "user_id": "u-late", "created_at": "2026-02-01"},
            {"target_id": "t-2", "user_id": "u-solo", "created_at": "2026-03-01"},
        ]
    )
    payers = resolve_target_payers(sb, ["t-1", "t-2", "t-orphan"])
    assert payers == {"t-1": "u-early", "t-2": "u-solo", "t-orphan": None}


def test_resolve_payers_empty_input_short_circuits():
    sb = MagicMock()
    assert resolve_target_payers(sb, []) == {}
    sb.table.assert_not_called()


# ---- PayerBudgetGate semantics -------------------------------------------------


def test_gate_blocks_over_budget_payer_and_orphans():
    gate = PayerBudgetGate(
        payer_by_target={"t-1": "u-over", "t-2": "u-ok", "t-3": None},
        over_budget_users=frozenset({"u-over"}),
    )
    assert gate.target_blocked("t-1") is True  # payer over budget
    assert gate.target_blocked("t-2") is False
    assert gate.target_blocked("t-3") is True  # orphan: never spend unattributed
    assert gate.target_blocked("t-unknown") is True  # post-snapshot activation
    assert gate.user_blocked("u-over") is True
    assert gate.user_blocked("u-ok") is False


def test_empty_gate_blocks_everything():
    """The refuse-to-spend fallback when the snapshot build fails."""
    gate = PayerBudgetGate()
    assert gate.target_blocked("any-target") is True
    assert gate.user_blocked("any-user") is False  # phase-2 keys on users it knows


# ---- build_budget_gate ----------------------------------------------------------


def test_build_gate_classifies_over_budget_payer(monkeypatch):
    import app.services.targets.payers as payers_mod

    monkeypatch.setattr(
        payers_mod,
        "resolve_target_payers",
        lambda sb, ids: {"t-1": "u-over", "t-2": "u-ok"},
    )
    # No overrides → settings default cap applies.
    sb = MagicMock()
    profile_chain = (
        sb.table.return_value.select.return_value.in_.return_value.execute
    )
    profile_chain.return_value.data = []
    monkeypatch.setattr(payers_mod.settings, "user_llm_monthly_budget_usd", 5.0)
    monkeypatch.setattr(
        payers_mod.cost_log,
        "total_spend",
        lambda sb, user_id, since: 6.0 if user_id == "u-over" else 0.5,
    )

    gate = build_budget_gate(sb, ["t-1", "t-2"])
    assert gate.target_blocked("t-1") is True
    assert gate.target_blocked("t-2") is False


def test_build_gate_zero_cap_disables_gating(monkeypatch):
    import app.services.targets.payers as payers_mod

    monkeypatch.setattr(
        payers_mod, "resolve_target_payers", lambda sb, ids: {"t-1": "u-1"}
    )
    sb = MagicMock()
    sb.table.return_value.select.return_value.in_.return_value.execute.return_value.data = []
    monkeypatch.setattr(payers_mod.settings, "user_llm_monthly_budget_usd", 0.0)
    spend_called = False

    def _spend(*a, **kw):
        nonlocal spend_called
        spend_called = True
        return 999.0

    monkeypatch.setattr(payers_mod.cost_log, "total_spend", _spend)

    gate = build_budget_gate(sb, ["t-1"])
    assert gate.target_blocked("t-1") is False
    assert spend_called is False  # 0 cap short-circuits the spend query


def test_build_gate_override_raises_cap(monkeypatch):
    """A user_profiles override above the spend keeps the payer unblocked."""
    import app.services.targets.payers as payers_mod

    monkeypatch.setattr(
        payers_mod, "resolve_target_payers", lambda sb, ids: {"t-1": "u-vip"}
    )
    sb = MagicMock()
    profile_chain = (
        sb.table.return_value.select.return_value.in_.return_value.execute
    )
    profile_chain.return_value.data = [
        {"user_id": "u-vip", "llm_monthly_budget_usd": 50}
    ]
    monkeypatch.setattr(payers_mod.settings, "user_llm_monthly_budget_usd", 5.0)
    monkeypatch.setattr(
        payers_mod.cost_log, "total_spend", lambda sb, user_id, since: 20.0
    )

    gate = build_budget_gate(sb, ["t-1"])
    assert gate.target_blocked("t-1") is False  # 20 < 50 override
