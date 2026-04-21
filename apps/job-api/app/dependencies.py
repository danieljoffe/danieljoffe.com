import hmac

import jwt
from fastapi import Depends, HTTPException, Request, Security
from fastapi.security import APIKeyHeader
from supabase import Client

from app.config import Settings, settings

api_key_header = APIKeyHeader(name="x-api-key", auto_error=False)


def get_settings() -> Settings:
    return settings


def get_supabase() -> Client:
    from app.supabase_pool import get_supabase_pool

    client = get_supabase_pool()
    if client is None:
        raise HTTPException(status_code=503, detail="Supabase not configured")
    return client


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
