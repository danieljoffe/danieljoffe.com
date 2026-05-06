"""Router tests for /profile/notifications — focuses on the
capability flags + the enable-when-unconfigured guard."""

from typing import Any
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.dependencies import get_supabase, verify_api_key_or_jwt
from app.main import app


class _Resp:
    def __init__(self, data: Any, count: int | None = None) -> None:
        self.data = data
        self.count = count


@pytest.fixture
def client_factory():
    def _make(supabase: MagicMock) -> TestClient:
        app.dependency_overrides[get_supabase] = lambda: supabase
        app.dependency_overrides[verify_api_key_or_jwt] = lambda: "test"
        return TestClient(app)

    yield _make
    app.dependency_overrides.clear()


@pytest.fixture
def _reset_channel_settings(monkeypatch: pytest.MonkeyPatch):
    """Force both channels into 'unconfigured' state for the test."""
    monkeypatch.setattr(settings, "next_app_url", "")
    monkeypatch.setattr(settings, "job_alert_secret", "")
    monkeypatch.setattr(settings, "twilio_account_sid", "")
    monkeypatch.setattr(settings, "twilio_auth_token", "")
    monkeypatch.setattr(settings, "twilio_phone_number", "")


def _profile_row() -> dict[str, Any]:
    return {
        "id": "p1",
        "job_notifications_enabled": False,
        "job_score_threshold": 100,
        "sms_notifications_enabled": False,
        "sms_score_threshold": 100,
        "sms_daily_limit": 5,
        "phone_number": None,
        "email": None,
    }


def test_get_returns_capabilities_false_when_unconfigured(
    client_factory, _reset_channel_settings
):
    sb = MagicMock()
    sb.table.return_value.select.return_value.limit.return_value.execute.return_value = (
        _Resp([_profile_row()])
    )
    client = client_factory(sb)
    r = client.get("/profile/notifications")
    assert r.status_code == 200
    body = r.json()
    assert body["email_available"] is False
    assert body["sms_available"] is False


def test_get_returns_capabilities_true_when_configured(
    client_factory, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setattr(settings, "next_app_url", "https://example.com")
    monkeypatch.setattr(settings, "job_alert_secret", "secret")
    monkeypatch.setattr(settings, "twilio_account_sid", "AC123")
    monkeypatch.setattr(settings, "twilio_auth_token", "token")
    monkeypatch.setattr(settings, "twilio_phone_number", "+15551234567")

    sb = MagicMock()
    sb.table.return_value.select.return_value.limit.return_value.execute.return_value = (
        _Resp([_profile_row()])
    )
    client = client_factory(sb)
    r = client.get("/profile/notifications")
    assert r.status_code == 200
    body = r.json()
    assert body["email_available"] is True
    assert body["sms_available"] is True


def test_patch_rejects_enabling_email_when_unconfigured(
    client_factory, _reset_channel_settings
):
    sb = MagicMock()
    client = client_factory(sb)
    r = client.patch(
        "/profile/notifications",
        json={"job_notifications_enabled": True},
    )
    assert r.status_code == 400
    assert "Email notifications are unavailable" in r.json()["detail"]


def test_patch_rejects_enabling_sms_when_unconfigured(
    client_factory, _reset_channel_settings
):
    sb = MagicMock()
    client = client_factory(sb)
    r = client.patch(
        "/profile/notifications",
        json={"sms_notifications_enabled": True},
    )
    assert r.status_code == 400
    assert "SMS notifications are unavailable" in r.json()["detail"]


def test_patch_allows_disabling_email_even_when_unconfigured(
    client_factory, _reset_channel_settings
):
    """Operator may have removed the credentials after the user enabled
    the channel — the user must still be able to turn it off."""
    sb = MagicMock()
    sb.table.return_value.select.return_value.limit.return_value.execute.return_value = (
        _Resp([_profile_row()])
    )
    sb.table.return_value.update.return_value.eq.return_value.execute.return_value = (
        _Resp(None)
    )
    client = client_factory(sb)
    r = client.patch(
        "/profile/notifications",
        json={"job_notifications_enabled": False},
    )
    assert r.status_code == 200
