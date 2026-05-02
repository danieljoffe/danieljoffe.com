import hmac
from typing import TYPE_CHECKING

import jwt
from fastapi import Depends, HTTPException, Request, Security
from fastapi.security import APIKeyHeader
from supabase import Client

from app.config import Settings, settings

if TYPE_CHECKING:
    from app.services.embeddings.client import EmbeddingsClient
    from app.services.llm.client import LLMClient

api_key_header = APIKeyHeader(name="x-api-key", auto_error=False)

# Sentinel user_id returned for api-key callers (cron / poller / batch jobs).
# Real users authenticate via Supabase JWT and `get_current_user_id` returns
# their JWT `sub` (a UUID). Phase 3b.3 will thread these per-user IDs through
# the service layer; until then api-key callers stay single-tenant under this
# label, matching the legacy `tools-admin` value to avoid orphaning rows.
SINGLE_USER_ID = "tools-admin"


def get_settings() -> Settings:
    return settings


def get_supabase() -> Client:
    from app.supabase_pool import get_supabase_pool

    client = get_supabase_pool()
    if client is None:
        raise HTTPException(status_code=503, detail="Supabase not configured")
    return client


def get_embeddings_client() -> "EmbeddingsClient":
    """Embeddings client factory. Returns the default (mock today,
    Voyage when the real implementation lands).
    """
    from app.services.embeddings import get_default_client

    return get_default_client()


def get_llm_client() -> "LLMClient":
    """LLM client factory. Returns the default (mock today, Anthropic
    when the real implementation lands).
    """
    from app.services.llm import get_default_client

    return get_default_client()


def _api_key_matches(presented: str | None, expected: str) -> bool:
    if not expected or not presented:
        return False
    return hmac.compare_digest(presented, expected)


def verify_api_key(
    key: str | None = Security(api_key_header),
    s: Settings = Depends(get_settings),
) -> str:
    if not _api_key_matches(key, s.wyrdfold_api_key):
        raise HTTPException(status_code=401, detail="Invalid API key")
    return key or ""


def _extract_bearer_token(request: Request) -> str | None:
    auth = request.headers.get("authorization")
    if not auth or not auth.lower().startswith("bearer "):
        return None
    return auth.split(" ", 1)[1].strip() or None


def _decode_supabase_jwt(token: str, secret: str) -> dict[str, object]:
    """Decode an HS256 Supabase access token.

    Raises ``HTTPException(401)`` on any verification failure. ``sub`` and
    ``exp`` are required so the token always identifies an account and a
    deadline.
    """
    try:
        payload: dict[str, object] = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            options={"require": ["exp", "sub"]},
            # Supabase signs access tokens with aud="authenticated".
            audience="authenticated",
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid auth token") from exc
    sub = payload.get("sub")
    if not isinstance(sub, str) or not sub:
        raise HTTPException(status_code=401, detail="Invalid auth token")
    return payload


def verify_supabase_jwt(
    request: Request,
    s: Settings = Depends(get_settings),
) -> str:
    """Require a valid Supabase Bearer token. Returns the user's `sub`."""
    if not s.supabase_jwt_secret:
        raise HTTPException(status_code=503, detail="JWT auth not configured")
    token = _extract_bearer_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Missing auth token")
    payload = _decode_supabase_jwt(token, s.supabase_jwt_secret)
    return str(payload["sub"])


def verify_api_key_or_jwt(
    request: Request,
    key: str | None = Security(api_key_header),
    s: Settings = Depends(get_settings),
) -> str:
    """Accept either the shared API key (cron) or a Supabase JWT (user)."""
    if _api_key_matches(key, s.wyrdfold_api_key):
        return "api-key"
    if s.supabase_jwt_secret:
        token = _extract_bearer_token(request)
        if token:
            try:
                _decode_supabase_jwt(token, s.supabase_jwt_secret)
            except HTTPException:
                pass
            else:
                return "jwt"
    raise HTTPException(status_code=401, detail="Unauthorized")


def get_current_user_id(
    request: Request,
    key: str | None = Security(api_key_header),
    s: Settings = Depends(get_settings),
) -> str:
    """Return the stable user_id for the current request.

    Supabase JWT callers get their `sub` (a UUID). API-key callers (cron,
    poller, batch) get the ``SINGLE_USER_ID`` sentinel — Phase 3b.3 will
    replace the sentinel with proper per-user routing for cron jobs that
    iterate users explicitly.
    """
    if s.supabase_jwt_secret:
        token = _extract_bearer_token(request)
        if token:
            try:
                payload = _decode_supabase_jwt(token, s.supabase_jwt_secret)
            except HTTPException:
                pass
            else:
                return str(payload["sub"])
    if _api_key_matches(key, s.wyrdfold_api_key):
        return SINGLE_USER_ID
    raise HTTPException(status_code=401, detail="Unauthorized")
