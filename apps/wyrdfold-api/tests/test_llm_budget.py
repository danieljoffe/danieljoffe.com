from datetime import UTC, datetime
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.services.llm import budget, cost_log


@pytest.fixture
def fake_supabase() -> MagicMock:
    return MagicMock()


def _patch_spend(monkeypatch: pytest.MonkeyPatch, *, hourly: float, daily: float) -> list[dict]:
    """Stub cost_log.total_spend. Routes by window width inferred from `since`."""
    calls: list[dict] = []

    def fake_total_spend(_supabase, *, user_id, since):
        calls.append({"user_id": user_id, "since": since})
        elapsed_s = (datetime.now(UTC) - since).total_seconds()
        # Hourly window is ~3600s; daily is ~86400s. Split at 2h.
        return hourly if elapsed_s < 7200 else daily

    monkeypatch.setattr(cost_log, "total_spend", fake_total_spend)
    return calls


def test_under_both_limits_passes(monkeypatch, fake_supabase):
    _patch_spend(monkeypatch, hourly=0.5, daily=2.0)
    budget.check_user_budget(
        fake_supabase, user_id="u1", daily_limit_usd=5.0, hourly_limit_usd=1.0
    )


def test_hourly_exceeded_raises_429(monkeypatch, fake_supabase):
    _patch_spend(monkeypatch, hourly=1.0, daily=0.0)
    with pytest.raises(HTTPException) as exc:
        budget.check_user_budget(
            fake_supabase, user_id="u1", daily_limit_usd=5.0, hourly_limit_usd=1.0
        )
    assert exc.value.status_code == 429
    assert exc.value.detail["scope"] == "hourly"
    assert exc.value.detail["code"] == "llm_budget_exceeded"
    assert exc.value.detail["limit_usd"] == 1.0


def test_daily_exceeded_raises_429(monkeypatch, fake_supabase):
    _patch_spend(monkeypatch, hourly=0.5, daily=5.0)
    with pytest.raises(HTTPException) as exc:
        budget.check_user_budget(
            fake_supabase, user_id="u1", daily_limit_usd=5.0, hourly_limit_usd=1.0
        )
    assert exc.value.status_code == 429
    assert exc.value.detail["scope"] == "daily"
    assert exc.value.detail["limit_usd"] == 5.0


def test_hourly_disabled_skips_query(monkeypatch, fake_supabase):
    calls = _patch_spend(monkeypatch, hourly=999.0, daily=2.0)
    budget.check_user_budget(
        fake_supabase, user_id="u1", daily_limit_usd=5.0, hourly_limit_usd=0.0
    )
    # Only the daily query should fire.
    assert len(calls) == 1


def test_daily_disabled_skips_query(monkeypatch, fake_supabase):
    calls = _patch_spend(monkeypatch, hourly=0.5, daily=999.0)
    budget.check_user_budget(
        fake_supabase, user_id="u1", daily_limit_usd=0.0, hourly_limit_usd=1.0
    )
    assert len(calls) == 1


def test_both_disabled_no_queries(monkeypatch, fake_supabase):
    calls = _patch_spend(monkeypatch, hourly=999.0, daily=999.0)
    budget.check_user_budget(
        fake_supabase, user_id="u1", daily_limit_usd=0.0, hourly_limit_usd=0.0
    )
    assert calls == []


def test_hourly_trips_first_when_both_exceeded(monkeypatch, fake_supabase):
    """Hourly is the smaller window — a spam burst should trip it before daily."""
    _patch_spend(monkeypatch, hourly=2.0, daily=10.0)
    with pytest.raises(HTTPException) as exc:
        budget.check_user_budget(
            fake_supabase, user_id="u1", daily_limit_usd=5.0, hourly_limit_usd=1.0
        )
    assert exc.value.detail["scope"] == "hourly"


def test_window_since_is_now_minus_offset(monkeypatch, fake_supabase):
    """Hourly window is 1h, daily is 24h, both anchored on now."""
    calls = _patch_spend(monkeypatch, hourly=0.0, daily=0.0)
    budget.check_user_budget(
        fake_supabase, user_id="u1", daily_limit_usd=5.0, hourly_limit_usd=1.0
    )
    assert len(calls) == 2
    hourly_since: datetime = calls[0]["since"]
    daily_since: datetime = calls[1]["since"]
    delta_seconds = (daily_since.replace(tzinfo=None) - hourly_since.replace(tzinfo=None)).total_seconds()
    # 24h - 1h = 23h = 82800s; allow a few seconds of clock drift between calls.
    assert -82800 - 5 < delta_seconds < -82800 + 5
