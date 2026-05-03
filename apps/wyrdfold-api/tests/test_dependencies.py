from datetime import UTC, datetime, timedelta
from typing import Any
from unittest.mock import MagicMock

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import HTTPException, Request
from jwt import PyJWKClientError

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

USER_SUB = "11111111-1111-1111-1111-111111111111"
TEST_SUPABASE_URL = "https://test-project.supabase.co"
TEST_ISSUER = f"{TEST_SUPABASE_URL}/auth/v1"
TEST_KID = "test-kid-1"

# Ephemeral EC P-256 keypair used by the whole module. Mirrors the asymmetric
# (ES256) signing model Supabase uses for access tokens. A second keypair is
# generated for "wrong signature" coverage.
_PRIVATE_KEY = ec.generate_private_key(ec.SECP256R1())
_PRIVATE_PEM = _PRIVATE_KEY.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.NoEncryption(),
)
_PUBLIC_KEY = _PRIVATE_KEY.public_key()

_OTHER_PRIVATE_KEY = ec.generate_private_key(ec.SECP256R1())
_OTHER_PRIVATE_PEM = _OTHER_PRIVATE_KEY.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.NoEncryption(),
)


class _FakeSigningKey:
    def __init__(self, key: Any) -> None:
        self.key = key


class _FakeJWKSClient:
    """Stand-in for PyJWKClient. Returns the test public key for any token.

    Mirrors the real client by parsing the token header first — that's where
    real PyJWKClient raises ``jwt.DecodeError`` on malformed input. Without
    this, malformed-token tests would silently pass through to ``jwt.decode``
    which raises a different (still PyJWTError) exception, and we wouldn't
    exercise the JWKS-side error path.
    """

    def __init__(self, key: Any) -> None:
        self._key = key

    def get_signing_key_from_jwt(self, token: str) -> _FakeSigningKey:
        # Triggers DecodeError on malformed tokens, matching real behavior.
        jwt.get_unverified_header(token)
        return _FakeSigningKey(self._key)


class _FailingJWKSClient:
    def get_signing_key_from_jwt(self, token: str) -> _FakeSigningKey:
        raise PyJWKClientError("JWKS endpoint unreachable")


@pytest.fixture(autouse=True)
def _patch_jwks(monkeypatch: pytest.MonkeyPatch) -> None:
    """Replace `_get_jwks_client` with a fake that returns the test public key.

    Individual tests can override by re-patching the same attribute.
    """
    from app import dependencies

    monkeypatch.setattr(
        dependencies,
        "_get_jwks_client",
        lambda s: _FakeJWKSClient(_PUBLIC_KEY),
    )


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


def _settings(api_key: str = "testkey", supabase_url: str = TEST_SUPABASE_URL) -> Settings:
    return Settings(wyrdfold_api_key=api_key, supabase_url=supabase_url)


def _mint(
    sub: str = USER_SUB,
    private_pem: bytes = _PRIVATE_PEM,
    aud: str = "authenticated",
    iss: str = TEST_ISSUER,
    exp_offset_seconds: int = 3600,
    kid: str = TEST_KID,
) -> str:
    payload = {
        "sub": sub,
        "aud": aud,
        "iss": iss,
        "exp": datetime.now(UTC) + timedelta(seconds=exp_offset_seconds),
    }
    return jwt.encode(payload, private_pem, algorithm="ES256", headers={"kid": kid})


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
        verify_supabase_jwt(req, s=_settings(supabase_url=""))
    assert exc.value.status_code == 503


def test_verify_supabase_jwt_missing_token():
    req = _make_request()
    with pytest.raises(HTTPException) as exc:
        verify_supabase_jwt(req, s=_settings())
    assert exc.value.status_code == 401


def test_verify_supabase_jwt_wrong_signature():
    bad_token = _mint(private_pem=_OTHER_PRIVATE_PEM)
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


def test_verify_supabase_jwt_wrong_issuer():
    """Tokens minted by a different Supabase project (or anything not matching
    `<supabase_url>/auth/v1`) must be rejected — pinning issuer prevents a
    leaked token from another project being replayed against this one.
    """
    bad_token = _mint(iss="https://other-project.supabase.co/auth/v1")
    req = _make_request({"authorization": f"Bearer {bad_token}"})
    with pytest.raises(HTTPException) as exc:
        verify_supabase_jwt(req, s=_settings())
    assert exc.value.status_code == 401


def test_verify_supabase_jwt_expired():
    token = _mint(exp_offset_seconds=-3600)
    req = _make_request({"authorization": f"Bearer {token}"})
    with pytest.raises(HTTPException) as exc:
        verify_supabase_jwt(req, s=_settings())
    assert exc.value.status_code == 401


def test_verify_supabase_jwt_malformed_bearer():
    req = _make_request({"authorization": "Token abc.def.ghi"})
    with pytest.raises(HTTPException) as exc:
        verify_supabase_jwt(req, s=_settings())
    assert exc.value.status_code == 401


@pytest.mark.parametrize(
    "bogus_token",
    [
        "not.a.real.token",  # base64-decodes to invalid UTF-8
        "abc",  # not enough segments
        "x.y.z",  # right shape, garbage base64
    ],
    ids=["invalid-utf8-header", "not-enough-segments", "garbage-base64"],
)
def test_verify_supabase_jwt_malformed_token_returns_401(bogus_token: str):
    """Regression: PyJWKClient.get_signing_key_from_jwt parses the token
    header and raises jwt.DecodeError (a PyJWTError) on malformed input —
    NOT PyJWKClientError. Originally this leaked through as a 500 with the
    parser error in the response body. Smoke-tested 2026-05-03.
    """
    req = _make_request({"authorization": f"Bearer {bogus_token}"})
    with pytest.raises(HTTPException) as exc:
        verify_supabase_jwt(req, s=_settings())
    assert exc.value.status_code == 401


def test_verify_supabase_jwt_jwks_fetch_failure(monkeypatch: pytest.MonkeyPatch):
    """If the JWKS endpoint is unreachable (or returns malformed JSON, or the
    token's `kid` isn't present after a refresh) PyJWKClient raises
    PyJWKClientError — the dep collapses it to 401 without leaking detail.
    """
    from app import dependencies

    monkeypatch.setattr(dependencies, "_get_jwks_client", lambda s: _FailingJWKSClient())
    req = _make_request({"authorization": f"Bearer {_mint()}"})
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
    bad_token = _mint(private_pem=_OTHER_PRIVATE_PEM)
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
        supabase_url=TEST_SUPABASE_URL,
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
