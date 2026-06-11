from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services import notify


class _ExecuteStub:
    """Captures the terminal `.execute()` result for a mocked Supabase chain."""

    def __init__(self, data: list[dict] | None, count: int | None = None):
        self.data = data
        self.count = count


def _build_supabase_mock(
    profiles: list[dict],
    claim_response: list[dict] | None = None,
) -> MagicMock:
    """Returns a MagicMock that answers:
    - table('user_profiles').select(...).eq(...).is_(...).execute()  → profiles
    - table('notifications_sent').upsert(...).execute()           → claim_response
    - table('notifications_sent').update(...).eq(...).execute()   → ok
    - table('notifications_sent').select(..., count=...).eq(...)  → count stub
    """
    profiles_chain = MagicMock()
    profiles_chain.select.return_value = profiles_chain
    profiles_chain.eq.return_value = profiles_chain
    profiles_chain.is_.return_value = profiles_chain
    profiles_chain.or_.return_value = profiles_chain
    profiles_chain.execute.return_value = _ExecuteStub(profiles)

    claim_chain = MagicMock()
    claim_chain.upsert.return_value = claim_chain
    claim_chain.execute.return_value = _ExecuteStub(claim_response)

    update_chain = MagicMock()
    update_chain.update.return_value = update_chain
    update_chain.eq.return_value = update_chain
    update_chain.execute.return_value = _ExecuteStub([])

    count_chain = MagicMock()
    count_chain.select.return_value = count_chain
    count_chain.eq.return_value = count_chain
    count_chain.gte.return_value = count_chain
    count_chain.execute.return_value = _ExecuteStub([], count=0)

    # Track calls to notifications_sent to route between claim/update/count
    notif_calls: dict[str, int] = {"n": 0}

    def _notif_table(_name: str) -> MagicMock:
        notif_calls["n"] += 1
        return claim_chain if notif_calls["n"] == 1 else update_chain

    supabase = MagicMock()

    def _table(name: str) -> MagicMock:
        if name == "user_profiles":
            return profiles_chain
        if name == "notifications_sent":
            return _notif_table(name)
        raise AssertionError(f"Unexpected table: {name}")

    supabase.table.side_effect = _table
    return supabase


def _build_sms_supabase_mock(
    profiles: list[dict],
    sms_count_today: int = 0,
    claim_response: list[dict] | None = None,
) -> MagicMock:
    """Supabase mock for SMS tests — handles count query + claim + update."""
    profiles_chain = MagicMock()
    profiles_chain.select.return_value = profiles_chain
    profiles_chain.eq.return_value = profiles_chain
    profiles_chain.is_.return_value = profiles_chain
    profiles_chain.or_.return_value = profiles_chain
    profiles_chain.execute.return_value = _ExecuteStub(profiles)

    count_chain = MagicMock()
    count_chain.select.return_value = count_chain
    count_chain.eq.return_value = count_chain
    count_chain.gte.return_value = count_chain
    count_chain.execute.return_value = _ExecuteStub([], count=sms_count_today)

    claim_chain = MagicMock()
    claim_chain.upsert.return_value = claim_chain
    claim_chain.execute.return_value = _ExecuteStub(claim_response)

    update_chain = MagicMock()
    update_chain.update.return_value = update_chain
    update_chain.eq.return_value = update_chain
    update_chain.execute.return_value = _ExecuteStub([])

    # SMS flow: 1st call=count, 2nd call=claim, 3rd call=update
    notif_calls: dict[str, int] = {"n": 0}

    def _notif_table(_name: str) -> MagicMock:
        notif_calls["n"] += 1
        if notif_calls["n"] == 1:
            return count_chain
        if notif_calls["n"] == 2:
            return claim_chain
        return update_chain

    supabase = MagicMock()

    def _table(name: str) -> MagicMock:
        if name == "user_profiles":
            return profiles_chain
        if name == "notifications_sent":
            return _notif_table(name)
        raise AssertionError(f"Unexpected table: {name}")

    supabase.table.side_effect = _table
    return supabase


@pytest.fixture(autouse=True)
def _reset_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    # Default: both env vars set so send path is exercised unless a test clears them.
    monkeypatch.setattr(notify.settings, "next_app_url", "https://example.com")
    monkeypatch.setattr(notify.settings, "job_alert_secret", "test-secret")
    monkeypatch.setattr(notify.settings, "twilio_account_sid", "")
    monkeypatch.setattr(notify.settings, "twilio_auth_token", "")
    monkeypatch.setattr(notify.settings, "twilio_phone_number", "")


# ---------------------------------------------------------------------------
# Email alert tests (#510)
# ---------------------------------------------------------------------------


async def test_returns_zero_when_env_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(notify.settings, "next_app_url", "")
    supabase = MagicMock()
    jobs: list[dict[str, object]] = [{"id": "j1", "score": 90}]
    assert await notify.send_alerts_for_new_jobs(supabase, jobs) == 0
    supabase.table.assert_not_called()


async def test_returns_zero_when_no_new_jobs() -> None:
    supabase = MagicMock()
    assert await notify.send_alerts_for_new_jobs(supabase, []) == 0
    supabase.table.assert_not_called()


async def test_returns_zero_when_no_active_profiles() -> None:
    supabase = _build_supabase_mock(profiles=[])
    jobs: list[dict[str, object]] = [{"id": "j1", "score": 95}]
    assert await notify.send_alerts_for_new_jobs(supabase, jobs) == 0


async def test_skips_jobs_below_threshold(monkeypatch: pytest.MonkeyPatch) -> None:
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

    jobs: list[dict[str, object]] = [
        {"id": "j1", "score": 50, "title": "x", "company_name": "y"},
    ]
    sent = await notify.send_alerts_for_new_jobs(supabase, jobs)

    assert sent == 0
    http_client.post.assert_not_awaited()


async def test_happy_path_sends_and_patches_external_id(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
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

    jobs: list[dict[str, object]] = [
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
    assert call is not None
    assert call.args[0] == "https://example.com/api/email/job-alert"
    assert call.kwargs["headers"]["Authorization"] == "Bearer test-secret"
    payload = call.kwargs["json"]
    assert payload["profileId"] == "p1"
    assert payload["to"] == "me@test"
    assert payload["jobId"] == "j1"
    assert payload["score"] == 85


async def test_dedup_hit_does_not_send(monkeypatch: pytest.MonkeyPatch) -> None:
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

    jobs: list[dict[str, object]] = [
        {"id": "j1", "score": 95, "title": "x", "company_name": "y"},
    ]
    sent = await notify.send_alerts_for_new_jobs(supabase, jobs)

    assert sent == 0
    http_client.post.assert_not_awaited()


async def test_upstream_failure_returns_zero(monkeypatch: pytest.MonkeyPatch) -> None:
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

    jobs: list[dict[str, object]] = [
        {"id": "j1", "score": 95, "title": "x", "company_name": "y"},
    ]
    sent = await notify.send_alerts_for_new_jobs(supabase, jobs)

    assert sent == 0
    http_client.post.assert_awaited_once()


# ---------------------------------------------------------------------------
# SMS alert tests (#511)
# ---------------------------------------------------------------------------

_SMS_PROFILE: dict[str, object] = {
    "id": "p1",
    "email": "me@test",
    "job_score_threshold": 70,
    "phone_number": "+15551234567",
    "sms_notifications_enabled": True,
    "sms_score_threshold": 85,
    "sms_daily_limit": 5,
}

_HIGH_SCORE_JOB: dict[str, object] = {
    "id": "j1",
    "score": 92,
    "title": "Senior Frontend",
    "company_name": "Acme",
    "absolute_url": "https://acme.com/jobs/1",
}


async def test_sms_skipped_when_twilio_not_configured() -> None:
    supabase = MagicMock()
    jobs: list[dict[str, object]] = [_HIGH_SCORE_JOB]
    # twilio_account_sid is "" by default in fixture
    assert await notify.send_sms_alerts_for_new_jobs(supabase, jobs) == 0
    supabase.table.assert_not_called()


async def test_sms_skipped_when_disabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(notify.settings, "twilio_account_sid", "AC123")
    monkeypatch.setattr(notify.settings, "twilio_auth_token", "token")
    disabled_profile = {**_SMS_PROFILE, "sms_notifications_enabled": False}
    supabase = _build_sms_supabase_mock(profiles=[disabled_profile])

    jobs: list[dict[str, object]] = [_HIGH_SCORE_JOB]
    assert await notify.send_sms_alerts_for_new_jobs(supabase, jobs) == 0


async def test_sms_skipped_below_threshold(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(notify.settings, "twilio_account_sid", "AC123")
    monkeypatch.setattr(notify.settings, "twilio_auth_token", "token")
    supabase = _build_sms_supabase_mock(profiles=[_SMS_PROFILE])

    low_job: dict[str, object] = {**_HIGH_SCORE_JOB, "score": 80}
    assert await notify.send_sms_alerts_for_new_jobs(supabase, [low_job]) == 0


async def test_sms_rate_limited(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(notify.settings, "twilio_account_sid", "AC123")
    monkeypatch.setattr(notify.settings, "twilio_auth_token", "token")
    supabase = _build_sms_supabase_mock(
        profiles=[_SMS_PROFILE],
        sms_count_today=5,  # at limit
    )

    jobs: list[dict[str, object]] = [_HIGH_SCORE_JOB]
    assert await notify.send_sms_alerts_for_new_jobs(supabase, jobs) == 0


async def test_sms_dedup_hit(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(notify.settings, "twilio_account_sid", "AC123")
    monkeypatch.setattr(notify.settings, "twilio_auth_token", "token")
    supabase = _build_sms_supabase_mock(
        profiles=[_SMS_PROFILE],
        sms_count_today=0,
        claim_response=[],  # claim lost
    )

    jobs: list[dict[str, object]] = [_HIGH_SCORE_JOB]
    assert await notify.send_sms_alerts_for_new_jobs(supabase, jobs) == 0


async def test_sms_happy_path(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(notify.settings, "twilio_account_sid", "AC123")
    monkeypatch.setattr(notify.settings, "twilio_auth_token", "token")
    monkeypatch.setattr(notify.settings, "twilio_phone_number", "+15559999999")
    supabase = _build_sms_supabase_mock(
        profiles=[_SMS_PROFILE],
        sms_count_today=2,
        claim_response=[{"id": "sent-1"}],
    )

    mock_message = MagicMock()
    mock_message.sid = "SM123abc"
    mock_create = MagicMock(return_value=mock_message)

    with patch("app.services.notify._send_twilio_sms", new_callable=AsyncMock) as mock_send:
        mock_send.return_value = "SM123abc"
        jobs: list[dict[str, object]] = [_HIGH_SCORE_JOB]
        sent = await notify.send_sms_alerts_for_new_jobs(supabase, jobs)

    assert sent == 1
    mock_send.assert_awaited_once()
    call_args = mock_send.await_args
    assert call_args is not None
    assert call_args.args[0] == "+15551234567"
    assert "Senior Frontend" in call_args.args[1]
    assert "Acme" in call_args.args[1]
    assert "92" in call_args.args[1]


async def test_sms_twilio_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(notify.settings, "twilio_account_sid", "AC123")
    monkeypatch.setattr(notify.settings, "twilio_auth_token", "token")
    supabase = _build_sms_supabase_mock(
        profiles=[_SMS_PROFILE],
        sms_count_today=0,
        claim_response=[{"id": "sent-1"}],
    )

    with patch("app.services.notify._send_twilio_sms", new_callable=AsyncMock) as mock_send:
        mock_send.side_effect = RuntimeError("Twilio down")
        jobs: list[dict[str, object]] = [_HIGH_SCORE_JOB]
        sent = await notify.send_sms_alerts_for_new_jobs(supabase, jobs)

    assert sent == 0
