from datetime import UTC, datetime, timedelta

import jwt
import pytest
from fastapi import HTTPException, Request

from app.config import Settings
from app.dependencies import (
    _api_key_matches,
    verify_api_key,
    verify_api_key_or_session,
    verify_session_jwt,
)

SECRET = "x" * 32


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


def _settings(api_key: str = "testkey", secret: str = SECRET) -> Settings:
    return Settings(wyrdfold_api_key=api_key, admin_session_secret=secret)


def _mint(sub: str = "tools-admin", secret: str = SECRET) -> str:
    payload = {
        "sub": sub,
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


def test_verify_session_jwt_short_secret():
    req = _make_request({"authorization": f"Bearer {_mint()}"})
    with pytest.raises(HTTPException) as exc:
        verify_session_jwt(req, s=_settings(secret="short"))
    assert exc.value.status_code == 503


def test_verify_session_jwt_missing_token():
    req = _make_request()
    with pytest.raises(HTTPException) as exc:
        verify_session_jwt(req, s=_settings())
    assert exc.value.status_code == 401


def test_verify_session_jwt_wrong_key():
    bad_token = _mint(secret="y" * 32)
    req = _make_request({"authorization": f"Bearer {bad_token}"})
    with pytest.raises(HTTPException) as exc:
        verify_session_jwt(req, s=_settings())
    assert exc.value.status_code == 401


def test_verify_session_jwt_wrong_sub():
    bad_token = _mint(sub="someone-else")
    req = _make_request({"authorization": f"Bearer {bad_token}"})
    with pytest.raises(HTTPException) as exc:
        verify_session_jwt(req, s=_settings())
    assert exc.value.status_code == 401


def test_verify_session_jwt_valid():
    req = _make_request({"authorization": f"Bearer {_mint()}"})
    assert verify_session_jwt(req, s=_settings()) == "tools-admin"


def test_verify_api_key_or_session_accepts_api_key():
    req = _make_request()
    assert verify_api_key_or_session(req, key="testkey", s=_settings()) == "api-key"


def test_verify_api_key_or_session_accepts_session():
    req = _make_request({"authorization": f"Bearer {_mint()}"})
    assert verify_api_key_or_session(req, key=None, s=_settings()) == "session"


def test_verify_api_key_or_session_rejects_both_missing():
    req = _make_request()
    with pytest.raises(HTTPException) as exc:
        verify_api_key_or_session(req, key=None, s=_settings())
    assert exc.value.status_code == 401
