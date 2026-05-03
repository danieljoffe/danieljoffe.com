from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock

import jwt
import pytest
from fastapi import HTTPException, Request

from app.config import Settings
from app.dependencies import (
    _api_key_matches,
    enforce_llm_budget,
    get_current_user_id,
    get_current_user_id_optional,
    verify_api_key,
    verify_api_key_or_jwt,
    verify_supabase_jwt,
)

JWT_SECRET = "x" * 32
USER_SUB = "11111111-1111-1111-1111-111111111111"


def _make_request(headers: dict[str, str] | None = None) -> Request:
    raw_headers = []
    if headers:
        for k, v in headers.items():
            raw_headers.append((k.lower().encode(), v.encode()))
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/",
        "headers": raw_headers,
    }
    return Request(scope)


def _settings(api_key: str = "testkey", jwt_secret: str = JWT_SECRET) -> Settings:
    return Settings(wyrdfold_api_key=api_key, supabase_jwt_secret=jwt_secret)


def _mint(
    sub: str = USER_SUB,
    secret: str = JWT_SECRET,
    aud: str = "authenticated",
) -> str:
    payload = {
        "sub": sub,
        "aud": aud,
        "exp": datetime.now(UTC) + timedelta(hours=1),
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def test_api_key_matches_none_presented():
    assert _api_key_matches(None, "x") is False


def test_api_key_matches_equal():
    assert _api_key_matches("x", "x") is True


def test_api_key_matches_different():
    assert _api_key_matches("y", "x") is False


def test_api_key_matches_both_empty():
    assert _api_key_matches("", "") is False


def test_api_key_matches_same_length_different():
    assert _api_key_matches("abc", "xyz") is False


def test_verify_api_key_raises_on_missing():
    with pytest.raises(HTTPException) as exc:
        verify_api_key(key=None, s=_settings())
    assert exc.value.status_code == 401


def test_verify_api_key_raises_on_wrong():
    with pytest.raises(HTTPException) as exc:
        verify_api_key(key="wrong", s=_settings())
    assert exc.value.status_code == 401


def test_verify_api_key_returns_on_match():
    assert verify_api_key(key="testkey", s=_settings()) == "testkey"


def test_verify_supabase_jwt_unconfigured():
    req = _make_request({"authorization": f"Bearer {_mint()}"})
    with pytest.raises(HTTPException) as exc:
        verify_supabase_jwt(req, s=_settings(jwt_secret=""))
    assert exc.value.status_code == 503


def test_verify_supabase_jwt_missing_token():
    req = _make_request()
    with pytest.raises(HTTPException) as exc:
        verify_supabase_jwt(req, s=_settings())
    assert exc.value.status_code == 401


def test_verify_supabase_jwt_wrong_signature():
    bad_token = _mint(secret="y" * 32)
    req = _make_request({"authorization": f"Bearer {bad_token}"})
    with pytest.raises(HTTPException) as exc:
        verify_supabase_jwt(req, s=_settings())
    assert exc.value.status_code == 401


def test_verify_supabase_jwt_wrong_audience():
    bad_token = _mint(aud="anon")
    req = _make_request({"authorization": f"Bearer {bad_token}"})
    with pytest.raises(HTTPException) as exc:
        verify_supabase_jwt(req, s=_settings())
    assert exc.value.status_code == 401


def test_verify_supabase_jwt_expired():
    payload = {
        "sub": USER_SUB,
        "aud": "authenticated",
        "exp": datetime.now(UTC) - timedelta(hours=1),
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")
    req = _make_request({"authorization": f"Bearer {token}"})
    with pytest.raises(HTTPException) as exc:
        verify_supabase_jwt(req, s=_settings())
    assert exc.value.status_code == 401


def test_verify_supabase_jwt_malformed_bearer():
    req = _make_request({"authorization": "Token abc.def.ghi"})
    with pytest.raises(HTTPException) as exc:
        verify_supabase_jwt(req, s=_settings())
    assert exc.value.status_code == 401


def test_verify_supabase_jwt_valid_returns_sub():
    req = _make_request({"authorization": f"Bearer {_mint()}"})
    assert verify_supabase_jwt(req, s=_settings()) == USER_SUB


def test_verify_api_key_or_jwt_accepts_api_key():
    req = _make_request()
    assert verify_api_key_or_jwt(req, key="testkey", s=_settings()) == "api-key"


def test_verify_api_key_or_jwt_accepts_jwt():
    req = _make_request({"authorization": f"Bearer {_mint()}"})
    assert verify_api_key_or_jwt(req, key=None, s=_settings()) == "jwt"


def test_verify_api_key_or_jwt_rejects_both_missing():
    req = _make_request()
    with pytest.raises(HTTPException) as exc:
        verify_api_key_or_jwt(req, key=None, s=_settings())
    assert exc.value.status_code == 401


def test_verify_api_key_or_jwt_rejects_invalid_jwt():
    bad_token = _mint(secret="y" * 32)
    req = _make_request({"authorization": f"Bearer {bad_token}"})
    with pytest.raises(HTTPException) as exc:
        verify_api_key_or_jwt(req, key=None, s=_settings())
    assert exc.value.status_code == 401


def test_get_current_user_id_returns_jwt_sub():
    req = _make_request({"authorization": f"Bearer {_mint()}"})
    assert get_current_user_id(req, s=_settings()) == USER_SUB


def test_get_current_user_id_rejects_api_key_only():
    """get_current_user_id is JWT-required — api-key callers must use
    get_current_user_id_optional or a cron-only auth dep instead.
    """
    req = _make_request()
    with pytest.raises(HTTPException) as exc:
        get_current_user_id(req, s=_settings())
    assert exc.value.status_code == 401


def test_get_current_user_id_rejects_unauthenticated():
    req = _make_request()
    with pytest.raises(HTTPException) as exc:
        get_current_user_id(req, s=_settings())
    assert exc.value.status_code == 401


def test_get_current_user_id_optional_returns_jwt_sub():
    req = _make_request({"authorization": f"Bearer {_mint()}"})
    assert get_current_user_id_optional(req, key=None, s=_settings()) == USER_SUB


def test_get_current_user_id_optional_returns_none_for_api_key():
    """API-key callers (cron/poller/batch) get None — services map None to
    the legacy NULL-user_id rows, preserving single-tenant behavior.
    """
    req = _make_request()
    assert get_current_user_id_optional(req, key="testkey", s=_settings()) is None


def test_get_current_user_id_optional_rejects_unauthenticated():
    req = _make_request()
    with pytest.raises(HTTPException) as exc:
        get_current_user_id_optional(req, key=None, s=_settings())
    assert exc.value.status_code == 401


def test_get_current_user_id_optional_prefers_jwt_over_api_key():
    """If both a valid JWT and a valid API key are present, prefer the JWT
    so the request runs under the user's identity, not the cron path.
    """
    req = _make_request({"authorization": f"Bearer {_mint()}"})
    assert get_current_user_id_optional(req, key="testkey", s=_settings()) == USER_SUB


def _budget_settings(daily: float = 5.0, hourly: float = 1.0) -> Settings:
    return Settings(
        wyrdfold_api_key="testkey",
        supabase_jwt_secret=JWT_SECRET,
        user_llm_daily_budget_usd=daily,
        user_llm_hourly_budget_usd=hourly,
    )


def test_enforce_llm_budget_apikey_caller_bypasses(monkeypatch):
    """API-key callers (user_id=None) skip the budget check entirely — no
    supabase round-trip, no spend lookup. System paths are trusted.
    """
    from app.services.llm import budget as budget_mod

    called = False

    def _spy(*a, **kw):
        nonlocal called
        called = True

    monkeypatch.setattr(budget_mod, "check_user_budget", _spy)
    enforce_llm_budget(user_id=None, supabase=MagicMock(), s=_budget_settings())
    assert called is False


def test_enforce_llm_budget_jwt_user_invokes_check(monkeypatch):
    from app.services.llm import budget as budget_mod

    captured: dict = {}

    def _spy(supabase, *, user_id, daily_limit_usd, hourly_limit_usd):
        captured.update(
            user_id=user_id,
            daily_limit_usd=daily_limit_usd,
            hourly_limit_usd=hourly_limit_usd,
        )

    monkeypatch.setattr(budget_mod, "check_user_budget", _spy)
    enforce_llm_budget(
        user_id=USER_SUB, supabase=MagicMock(), s=_budget_settings(daily=7.0, hourly=2.0)
    )
    assert captured == {
        "user_id": USER_SUB,
        "daily_limit_usd": 7.0,
        "hourly_limit_usd": 2.0,
    }


def test_enforce_llm_budget_propagates_429(monkeypatch):
    """If the underlying check raises 429, the dep surfaces it unchanged."""
    from app.services.llm import budget as budget_mod

    def _raise(*a, **kw):
        raise HTTPException(
            status_code=429, detail={"code": "llm_budget_exceeded", "scope": "hourly"}
        )

    monkeypatch.setattr(budget_mod, "check_user_budget", _raise)
    with pytest.raises(HTTPException) as exc:
        enforce_llm_budget(user_id=USER_SUB, supabase=MagicMock(), s=_budget_settings())
    assert exc.value.status_code == 429
    assert exc.value.detail["scope"] == "hourly"
