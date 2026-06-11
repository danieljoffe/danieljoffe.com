"""Tests for the idle-account lifecycle sweep + activity stamping."""

from datetime import UTC, datetime, timedelta
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services import lifecycle

# ---- _deactivate_idle_targets -------------------------------------------------


def _supabase_for_sweep(
    *,
    idle_user_ids: list[str],
    flipped_rows_by_user: dict[str, list[dict[str, Any]]],
) -> MagicMock:
    """Mock the three queries the sweep runs: idle profiles, the flip
    update per user, and the labels lookup."""
    supabase = MagicMock()

    def table(name: str) -> MagicMock:
        t = MagicMock()
        if name == "user_profiles":
            t.select.return_value.lt.return_value.execute.return_value.data = [
                {"user_id": uid} for uid in idle_user_ids
            ]
        elif name == "user_targets":
            # .update().eq(user_id).eq(is_active).execute() — return the
            # rows for whichever user this call is for. MagicMock can't
            # branch on eq args easily; queue per-call side effects.
            t.update.return_value.eq.return_value.eq.return_value.execute.side_effect = [
                MagicMock(data=flipped_rows_by_user.get(uid, []))
                for uid in idle_user_ids
            ]
        elif name == "targets":
            t.select.return_value.in_.return_value.execute.return_value.data = [
                {"label": "Director of CX"}
            ]
        elif name == "batch_runs":
            t.update.return_value.eq.return_value.lt.return_value.execute.return_value.data = []
        return t

    supabase.table.side_effect = table
    return supabase


@pytest.mark.asyncio
async def test_sweep_deactivates_idle_users_and_emails_once(monkeypatch):
    sb = _supabase_for_sweep(
        idle_user_ids=["u-idle"],
        flipped_rows_by_user={
            "u-idle": [{"target_id": "t-1", "user_id": "u-idle"}]
        },
    )
    email_spy = AsyncMock(return_value=True)
    monkeypatch.setattr(lifecycle.notify, "send_target_paused_email", email_spy)

    result = await lifecycle.run_lifecycle_sweep(sb)

    assert result["deactivated"] == 1
    email_spy.assert_awaited_once()
    kwargs = email_spy.await_args.kwargs
    assert kwargs["user_id"] == "u-idle"
    assert kwargs["target_labels"] == ["Director of CX"]


@pytest.mark.asyncio
async def test_sweep_skips_users_with_no_active_links(monkeypatch):
    """Idempotency: an idle user whose links are already inactive gets no
    update rows back → no email, count 0."""
    sb = _supabase_for_sweep(
        idle_user_ids=["u-idle"], flipped_rows_by_user={"u-idle": []}
    )
    email_spy = AsyncMock()
    monkeypatch.setattr(lifecycle.notify, "send_target_paused_email", email_spy)

    result = await lifecycle.run_lifecycle_sweep(sb)

    assert result["deactivated"] == 0
    email_spy.assert_not_awaited()


@pytest.mark.asyncio
async def test_sweep_disabled_when_threshold_zero(monkeypatch):
    monkeypatch.setattr(lifecycle.settings, "idle_deactivate_days", 0)
    sb = MagicMock()
    sb.table.return_value.update.return_value.eq.return_value.lt.return_value.execute.return_value.data = []

    result = await lifecycle.run_lifecycle_sweep(sb)

    assert result["deactivated"] == 0


@pytest.mark.asyncio
async def test_email_failure_does_not_block_deactivation(monkeypatch):
    sb = _supabase_for_sweep(
        idle_user_ids=["u-idle"],
        flipped_rows_by_user={
            "u-idle": [{"target_id": "t-1", "user_id": "u-idle"}]
        },
    )
    monkeypatch.setattr(
        lifecycle.notify,
        "send_target_paused_email",
        AsyncMock(side_effect=RuntimeError("resend down")),
    )

    result = await lifecycle.run_lifecycle_sweep(sb)

    assert result["deactivated"] == 1  # flip happened despite email failure


# ---- batch reaper --------------------------------------------------------------


@pytest.mark.asyncio
async def test_reaper_fails_stuck_processing_batches():
    sb = MagicMock()

    def table(name: str) -> MagicMock:
        t = MagicMock()
        if name == "user_profiles":
            t.select.return_value.lt.return_value.execute.return_value.data = []
        elif name == "batch_runs":
            t.update.return_value.eq.return_value.lt.return_value.execute.return_value.data = [
                {"id": "b-1"},
                {"id": "b-2"},
            ]
        return t

    sb.table.side_effect = table
    result = await lifecycle.run_lifecycle_sweep(sb)
    assert result["batches_reaped"] == 2


# ---- activity stamp (dependencies) ----------------------------------------------


def test_touch_last_seen_throttles_and_respects_flag(monkeypatch):
    from app import dependencies as deps

    writes: list[str] = []

    class _FakeTable:
        def update(self, payload):
            return self

        def eq(self, *_a):
            return self

        def execute(self):
            writes.append("write")
            return MagicMock()

    fake_sb = MagicMock()
    fake_sb.table.return_value = _FakeTable()
    monkeypatch.setattr(deps, "get_supabase", lambda: fake_sb)
    monkeypatch.setattr(deps, "_LAST_SEEN_STAMPED", {})

    s_enabled = MagicMock(activity_tracking_enabled=True)
    deps._touch_last_seen("u-1", s_enabled)
    deps._touch_last_seen("u-1", s_enabled)  # within the hour → throttled
    assert writes == ["write"]

    s_disabled = MagicMock(activity_tracking_enabled=False)
    monkeypatch.setattr(deps, "_LAST_SEEN_STAMPED", {})
    deps._touch_last_seen("u-2", s_disabled)
    assert writes == ["write"]  # flag off → no new write


def test_touch_last_seen_swallows_failures(monkeypatch):
    from app import dependencies as deps

    def _boom():
        raise RuntimeError("supabase down")

    monkeypatch.setattr(deps, "get_supabase", _boom)
    monkeypatch.setattr(deps, "_LAST_SEEN_STAMPED", {})
    s = MagicMock(activity_tracking_enabled=True)
    deps._touch_last_seen("u-1", s)  # must not raise


# ---- gate idle blocking ----------------------------------------------------------


def test_gate_blocks_idle_payer(monkeypatch):
    import app.services.targets.payers as payers_mod
    from app.services.targets.payers import build_budget_gate

    monkeypatch.setattr(
        payers_mod,
        "resolve_target_payers",
        lambda sb, ids: {"t-idle": "u-idle", "t-fresh": "u-fresh"},
    )
    old = (datetime.now(UTC) - timedelta(days=8)).isoformat()
    fresh = (datetime.now(UTC) - timedelta(hours=1)).isoformat()
    sb = MagicMock()
    sb.table.return_value.select.return_value.in_.return_value.execute.return_value.data = [
        {"user_id": "u-idle", "llm_monthly_budget_usd": None, "last_seen_at": old},
        {"user_id": "u-fresh", "llm_monthly_budget_usd": None, "last_seen_at": fresh},
    ]
    monkeypatch.setattr(payers_mod.settings, "idle_defer_days", 7)
    monkeypatch.setattr(payers_mod.settings, "user_llm_monthly_budget_usd", 5.0)
    monkeypatch.setattr(
        payers_mod.cost_log, "total_spend", lambda sb, user_id, since: 0.0
    )

    gate = build_budget_gate(sb, ["t-idle", "t-fresh"])
    assert gate.target_blocked("t-idle") is True
    assert gate.user_blocked("u-idle") is True
    assert gate.target_blocked("t-fresh") is False


def test_gate_null_last_seen_not_blocked(monkeypatch):
    """NULL last_seen_at (pre-backfill rows / missing profile) is treated
    as active — never punish missing data."""
    import app.services.targets.payers as payers_mod
    from app.services.targets.payers import build_budget_gate

    monkeypatch.setattr(
        payers_mod, "resolve_target_payers", lambda sb, ids: {"t-1": "u-1"}
    )
    sb = MagicMock()
    sb.table.return_value.select.return_value.in_.return_value.execute.return_value.data = [
        {"user_id": "u-1", "llm_monthly_budget_usd": None, "last_seen_at": None},
    ]
    monkeypatch.setattr(payers_mod.settings, "idle_defer_days", 7)
    monkeypatch.setattr(payers_mod.settings, "user_llm_monthly_budget_usd", 5.0)
    monkeypatch.setattr(
        payers_mod.cost_log, "total_spend", lambda sb, user_id, since: 0.0
    )

    gate = build_budget_gate(sb, ["t-1"])
    assert gate.target_blocked("t-1") is False


def test_gate_idle_defer_zero_disables(monkeypatch):
    import app.services.targets.payers as payers_mod
    from app.services.targets.payers import build_budget_gate

    monkeypatch.setattr(
        payers_mod, "resolve_target_payers", lambda sb, ids: {"t-1": "u-1"}
    )
    ancient = (datetime.now(UTC) - timedelta(days=365)).isoformat()
    sb = MagicMock()
    sb.table.return_value.select.return_value.in_.return_value.execute.return_value.data = [
        {"user_id": "u-1", "llm_monthly_budget_usd": None, "last_seen_at": ancient},
    ]
    monkeypatch.setattr(payers_mod.settings, "idle_defer_days", 0)
    monkeypatch.setattr(payers_mod.settings, "user_llm_monthly_budget_usd", 5.0)
    monkeypatch.setattr(
        payers_mod.cost_log, "total_spend", lambda sb, user_id, since: 0.0
    )

    gate = build_budget_gate(sb, ["t-1"])
    assert gate.target_blocked("t-1") is False


# ---- paid-source skip -------------------------------------------------------------


def test_drop_paid_sources_when_no_active_targets():
    from app.services.poller import _drop_paid_sources_if_unconsumed

    sources = [
        {"id": "s-1", "provider": "greenhouse"},
        {"id": "s-2", "provider": "crawl"},
        {"id": "s-3", "provider": "lever"},
    ]
    kept = _drop_paid_sources_if_unconsumed(sources, has_active_targets=False)
    assert [s["id"] for s in kept] == ["s-1", "s-3"]

    kept_all = _drop_paid_sources_if_unconsumed(sources, has_active_targets=True)
    assert kept_all == sources


# ---- source failure backoff ---------------------------------------------------------


@pytest.mark.asyncio
async def test_source_failure_increments_and_disables_at_threshold(monkeypatch):
    from app.services import poller

    monkeypatch.setattr(poller.settings, "source_failure_disable_threshold", 10)
    captured: list[dict[str, Any]] = []
    sb = MagicMock()

    def _capture_update(payload):
        captured.append(payload)
        chain = MagicMock()
        chain.eq.return_value.execute.return_value = MagicMock()
        return chain

    sb.table.return_value.update.side_effect = _capture_update

    await poller._record_source_failure(
        sb, {"id": "s-1", "company_name": "Dead Co", "consecutive_failures": 3}
    )
    assert captured[-1] == {"consecutive_failures": 4}

    await poller._record_source_failure(
        sb, {"id": "s-1", "company_name": "Dead Co", "consecutive_failures": 9}
    )
    assert captured[-1] == {"consecutive_failures": 10, "enabled": False}


@pytest.mark.asyncio
async def test_source_failure_threshold_zero_disables_backoff(monkeypatch):
    from app.services import poller

    monkeypatch.setattr(poller.settings, "source_failure_disable_threshold", 0)
    sb = MagicMock()
    await poller._record_source_failure(sb, {"id": "s-1"})
    sb.table.assert_not_called()
