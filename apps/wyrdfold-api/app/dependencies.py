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
    if not _api_key_matches(key, s.job_api_key):
        raise HTTPException(status_code=401, detail="Invalid API key")
    return key or ""


def _extract_bearer_token(request: Request) -> str | None:
    auth = request.headers.get("authorization")
    if not auth or not auth.lower().startswith("bearer "):
        return None
    return auth.split(" ", 1)[1].strip() or None


def verify_session_jwt(
    request: Request,
    s: Settings = Depends(get_settings),
) -> str:
    if not s.admin_session_secret or len(s.admin_session_secret) < 32:
        raise HTTPException(status_code=503, detail="Session auth not configured")
    token = _extract_bearer_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Missing session token")
    try:
        payload = jwt.decode(
            token,
            s.admin_session_secret,
            algorithms=["HS256"],
            options={"require": ["exp", "sub"]},
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid session token") from exc
    if payload.get("sub") != "tools-admin":
        raise HTTPException(status_code=401, detail="Invalid session token")
    return str(payload["sub"])


def verify_api_key_or_session(
    request: Request,
    key: str | None = Security(api_key_header),
    s: Settings = Depends(get_settings),
) -> str:
    if _api_key_matches(key, s.job_api_key):
        return "api-key"
    if s.admin_session_secret and len(s.admin_session_secret) >= 32:
        token = _extract_bearer_token(request)
        if token:
            try:
                payload = jwt.decode(
                    token,
                    s.admin_session_secret,
                    algorithms=["HS256"],
                    options={"require": ["exp", "sub"]},
                )
            except jwt.PyJWTError:
                pass
            else:
                if payload.get("sub") == "tools-admin":
                    return "session"
    raise HTTPException(status_code=401, detail="Unauthorized")


# Single-admin user identifier used for per-user data (user_targets, etc.)
# until multi-user auth lands. Matches the JWT `sub` claim minted by
# apps/root/src/lib/adminSession.ts.
SINGLE_USER_ID = "tools-admin"


def get_current_user_id(
    request: Request,
    key: str | None = Security(api_key_header),
    s: Settings = Depends(get_settings),
) -> str:
    """Return the stable user_id for the current request.

    Today there's only one admin (sub=`tools-admin`), so this returns
    `SINGLE_USER_ID` for both session and API-key callers. When real
    multi-user auth lands, this will return the JWT sub directly so each
    user gets their own user_targets rows.
    """
    if s.admin_session_secret and len(s.admin_session_secret) >= 32:
        token = _extract_bearer_token(request)
        if token:
            try:
                payload = jwt.decode(
                    token,
                    s.admin_session_secret,
                    algorithms=["HS256"],
                    options={"require": ["exp", "sub"]},
                )
            except jwt.PyJWTError:
                pass
            else:
                sub = payload.get("sub")
                if isinstance(sub, str) and sub:
                    return sub
    if _api_key_matches(key, s.job_api_key):
        return SINGLE_USER_ID
    raise HTTPException(status_code=401, detail="Unauthorized")
