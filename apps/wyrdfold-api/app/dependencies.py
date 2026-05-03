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


def _try_decode_jwt_sub(request: Request, s: Settings) -> str | None:
    """Return the JWT `sub` if a valid Bearer token is present, else None."""
    if not s.supabase_jwt_secret:
        return None
    token = _extract_bearer_token(request)
    if not token:
        return None
    try:
        payload = _decode_supabase_jwt(token, s.supabase_jwt_secret)
    except HTTPException:
        return None
    return str(payload["sub"])


def get_current_user_id(
    request: Request,
    s: Settings = Depends(get_settings),
) -> str:
    """Return the JWT `sub` for the current request (JWT-required).

    Use on endpoints that need a real user identity (no api-key fallback).
    """
    sub = _try_decode_jwt_sub(request, s)
    if sub is None:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return sub


def get_current_user_id_optional(
    request: Request,
    key: str | None = Security(api_key_header),
    s: Settings = Depends(get_settings),
) -> str | None:
    """Return the JWT `sub`, or None for api-key callers (cron/poller/batch).

    Routes accepting both auth modes use this to thread the user identity
    through the service layer: JWT → real per-user data, api-key → legacy
    single-tenant rows (where user_id IS NULL). Raises 401 if neither auth
    mode matches.
    """
    sub = _try_decode_jwt_sub(request, s)
    if sub is not None:
        return sub
    if _api_key_matches(key, s.wyrdfold_api_key):
        return None
    raise HTTPException(status_code=401, detail="Unauthorized")
