"""Global LLM circuit breaker: when the day's total spend across ALL
users hits ``global_llm_daily_budget_usd``, the poll cycle's budget gate
goes empty (every target defers) while jobs keep ingesting."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from unittest.mock import MagicMock

import pytest

from app.config import settings as live_settings
from app.services import poller as poller_mod
from app.services.llm import cost_log


class _Resp:
    def __init__(self, data: Any) -> None:
        self.data = data


# ---- cost_log.total_spend_all ----------------------------------------------


def test_total_spend_all_sums_across_all_users() -> None:
    sb = MagicMock()
    sel = sb.table.return_value.select.return_value
    sel.gte.return_value.execute.return_value = _Resp(
        [{"cost_usd": 0.50}, {"cost_usd": 0.25}, {"cost_usd": 0.10}]
    )

    result = cost_log.total_spend_all(sb, since=datetime.now(UTC))

    assert result == pytest.approx(0.85)
    sb.table.assert_called_once_with("llm_costs")
    # The whole point: NO per-user partition — neither .eq nor .is_.
    sel.eq.assert_not_called()
    sel.is_.assert_not_called()


def test_total_spend_all_without_since_selects_everything() -> None:
    sb = MagicMock()
    sel = sb.table.return_value.select.return_value
    sel.execute.return_value = _Resp([{"cost_usd": 1.0}])

    assert cost_log.total_spend_all(sb) == pytest.approx(1.0)
    sel.gte.assert_not_called()


def test_total_spend_all_empty_window_is_zero() -> None:
    sb = MagicMock()
    sel = sb.table.return_value.select.return_value
    sel.gte.return_value.execute.return_value = _Resp([])

    assert cost_log.total_spend_all(sb, since=datetime.now(UTC)) == 0.0


# ---- _cycle_budget_gate breaker integration ---------------------------------


def _active_target() -> MagicMock:
    target = MagicMock()
    target.id = "t-1"
    return target


@pytest.mark.asyncio
async def test_breaker_tripped_returns_empty_gate(monkeypatch) -> None:
    """Spend at/over the cap → EMPTY gate (all targets blocked), no
    payer-gate build, but has_active_targets stays truthful."""
    monkeypatch.setattr(live_settings, "global_llm_daily_budget_usd", 10.0)
    spend = MagicMock(return_value=12.34)
    build = MagicMock()
    monkeypatch.setattr(poller_mod, "total_llm_spend_all", spend)
    monkeypatch.setattr(poller_mod, "build_budget_gate", build)
    monkeypatch.setattr(
        poller_mod, "get_active_target", lambda _sb: [_active_target()]
    )

    gate, has_active = await poller_mod._cycle_budget_gate(MagicMock())

    assert has_active is True
    assert gate.target_blocked("t-1") is True
    assert gate.target_blocked("any-other-target") is True
    build.assert_not_called()
    # The window starts at UTC midnight.
    since = spend.call_args.kwargs["since"]
    assert (since.hour, since.minute, since.second) == (0, 0, 0)
    assert since.tzinfo == UTC


@pytest.mark.asyncio
async def test_breaker_under_cap_builds_normal_gate(monkeypatch) -> None:
    monkeypatch.setattr(live_settings, "global_llm_daily_budget_usd", 10.0)
    monkeypatch.setattr(
        poller_mod, "total_llm_spend_all", MagicMock(return_value=1.25)
    )
    real_gate = MagicMock()
    monkeypatch.setattr(
        poller_mod, "build_budget_gate", MagicMock(return_value=real_gate)
    )
    monkeypatch.setattr(
        poller_mod, "get_active_target", lambda _sb: [_active_target()]
    )

    gate, has_active = await poller_mod._cycle_budget_gate(MagicMock())

    assert gate is real_gate
    assert has_active is True


@pytest.mark.asyncio
async def test_breaker_disabled_when_cap_is_zero(monkeypatch) -> None:
    monkeypatch.setattr(live_settings, "global_llm_daily_budget_usd", 0.0)
    spend = MagicMock(return_value=999.0)
    monkeypatch.setattr(poller_mod, "total_llm_spend_all", spend)
    real_gate = MagicMock()
    monkeypatch.setattr(
        poller_mod, "build_budget_gate", MagicMock(return_value=real_gate)
    )
    monkeypatch.setattr(
        poller_mod, "get_active_target", lambda _sb: [_active_target()]
    )

    gate, _ = await poller_mod._cycle_budget_gate(MagicMock())

    assert gate is real_gate
    spend.assert_not_called()


@pytest.mark.asyncio
async def test_breaker_query_failure_never_crashes_the_poll(monkeypatch) -> None:
    """A spend-meter read failure falls into the existing fail-closed
    arm: empty gate, has_active=True, no exception escapes."""
    monkeypatch.setattr(live_settings, "global_llm_daily_budget_usd", 10.0)
    monkeypatch.setattr(
        poller_mod,
        "total_llm_spend_all",
        MagicMock(side_effect=RuntimeError("db down")),
    )
    monkeypatch.setattr(
        poller_mod, "get_active_target", lambda _sb: [_active_target()]
    )

    gate, has_active = await poller_mod._cycle_budget_gate(MagicMock())

    assert has_active is True
    assert gate.target_blocked("t-1") is True
