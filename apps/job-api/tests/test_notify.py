from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services import notify


class _ExecuteStub:
    """Captures the terminal `.execute()` result for a mocked Supabase chain."""

    def __init__(self, data: list[dict] | None):
        self.data = data


def _build_supabase_mock(
    profiles: list[dict],
    claim_response: list[dict] | None = None,
) -> MagicMock:
    """Returns a MagicMock that answers:
    - table('user_profiles').select(...).eq(...).is_(...).execute()  → profiles
    - table('job_notification_sent').upsert(...).execute()           → claim_response
    - table('job_notification_sent').update(...).eq(...).execute()   → ok
    """
    profiles_chain = MagicMock()
    profiles_chain.select.return_value = profiles_chain
    profiles_chain.eq.return_value = profiles_chain
    profiles_chain.is_.return_value = profiles_chain
    profiles_chain.execute.return_value = _ExecuteStub(profiles)

    claim_chain = MagicMock()
    claim_chain.upsert.return_value = claim_chain
    claim_chain.execute.return_value = _ExecuteStub(claim_response)

    update_chain = MagicMock()
    update_chain.update.return_value = update_chain
    update_chain.eq.return_value = update_chain
    update_chain.execute.return_value = _ExecuteStub([])

    # First call to .table('job_notification_sent') is the upsert (claim);
    # second call is the update (patch resend_id). Drive both off a counter.
    notif_calls = {"n": 0}

    def _notif_table(_name: str) -> MagicMock:
        notif_calls["n"] += 1
        return claim_chain if notif_calls["n"] == 1 else update_chain

    supabase = MagicMock()

    def _table(name: str):
        if name == "user_profiles":
            return profiles_chain
        if name == "job_notification_sent":
            return _notif_table(name)
        raise AssertionError(f"Unexpected table: {name}")

    supabase.table.side_effect = _table
    return supabase


@pytest.fixture(autouse=True)
def _reset_settings(monkeypatch):
    # Default: both env vars set so send path is exercised unless a test clears them.
    monkeypatch.setattr(notify.settings, "next_app_url", "https://example.com")
    monkeypatch.setattr(notify.settings, "job_alert_secret", "test-secret")
    yield


async def test_returns_zero_when_env_missing(monkeypatch):
    monkeypatch.setattr(notify.settings, "next_app_url", "")
    supabase = MagicMock()
    jobs = [{"id": "j1", "score": 90}]
    assert await notify.send_alerts_for_new_jobs(supabase, jobs) == 0
    supabase.table.assert_not_called()


async def test_returns_zero_when_no_new_jobs():
    supabase = MagicMock()
    assert await notify.send_alerts_for_new_jobs(supabase, []) == 0
    supabase.table.assert_not_called()


async def test_returns_zero_when_no_active_profiles():
    supabase = _build_supabase_mock(profiles=[])
    jobs = [{"id": "j1", "score": 95}]
    assert await notify.send_alerts_for_new_jobs(supabase, jobs) == 0


async def test_skips_jobs_below_threshold(monkeypatch):
    # Profile wants score >= 70; job is 50 — must not send.
    supabase = _build_supabase_mock(
        profiles=[
            {"id": "p1", "email": "me@test", "job_score_threshold": 70},
        ],
        claim_response=[{"id": "sent-1"}],
    )
    http_client = MagicMock()
    http_client.post = AsyncMock()
    monkeypatch.setattr(notify, "get_http_client", lambda: http_client)

    jobs = [{"id": "j1", "score": 50, "title": "x", "company_name": "y"}]
    sent = await notify.send_alerts_for_new_jobs(supabase, jobs)

    assert sent == 0
    http_client.post.assert_not_awaited()


async def test_happy_path_sends_and_patches_resend_id(monkeypatch):
    supabase = _build_supabase_mock(
        profiles=[
            {"id": "p1", "email": "me@test", "job_score_threshold": 70},
        ],
        claim_response=[{"id": "sent-1"}],
    )
    response = MagicMock()
    response.status_code = 200
    response.json.return_value = {"ok": True, "resendId": "resend-abc"}
    http_client = MagicMock()
    http_client.post = AsyncMock(return_value=response)
    monkeypatch.setattr(notify, "get_http_client", lambda: http_client)

    jobs = [
        {
            "id": "j1",
            "score": 85,
            "title": "Senior Frontend",
            "company_name": "Acme",
            "location": "Remote",
            "absolute_url": "https://acme.com/jobs/1",
        }
    ]

    sent = await notify.send_alerts_for_new_jobs(supabase, jobs)

    assert sent == 1
    http_client.post.assert_awaited_once()
    call = http_client.post.await_args
    assert call.args[0] == "https://example.com/api/email/job-alert"
    assert call.kwargs["headers"]["Authorization"] == "Bearer test-secret"
    payload = call.kwargs["json"]
    assert payload["profileId"] == "p1"
    assert payload["to"] == "me@test"
    assert payload["jobId"] == "j1"
    assert payload["score"] == 85


async def test_dedup_hit_does_not_send(monkeypatch):
    # Upsert returns empty data → claim lost, do not send.
    supabase = _build_supabase_mock(
        profiles=[
            {"id": "p1", "email": "me@test", "job_score_threshold": 70},
        ],
        claim_response=[],
    )
    http_client = MagicMock()
    http_client.post = AsyncMock()
    monkeypatch.setattr(notify, "get_http_client", lambda: http_client)

    jobs = [{"id": "j1", "score": 95, "title": "x", "company_name": "y"}]
    sent = await notify.send_alerts_for_new_jobs(supabase, jobs)

    assert sent == 0
    http_client.post.assert_not_awaited()


async def test_upstream_failure_returns_zero(monkeypatch):
    supabase = _build_supabase_mock(
        profiles=[
            {"id": "p1", "email": "me@test", "job_score_threshold": 70},
        ],
        claim_response=[{"id": "sent-1"}],
    )
    response = MagicMock()
    response.status_code = 502
    response.text = "bad gateway"
    http_client = MagicMock()
    http_client.post = AsyncMock(return_value=response)
    monkeypatch.setattr(notify, "get_http_client", lambda: http_client)

    jobs = [{"id": "j1", "score": 95, "title": "x", "company_name": "y"}]
    sent = await notify.send_alerts_for_new_jobs(supabase, jobs)

    assert sent == 0
    http_client.post.assert_awaited_once()
