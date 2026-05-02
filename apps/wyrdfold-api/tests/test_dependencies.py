from datetime import UTC, datetime, timedelta

import jwt
import pytest
from fastapi import HTTPException, Request

from app.config import Settings
from app.dependencies import (
    _api_key_matches,
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
