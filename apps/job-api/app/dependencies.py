import jwt
from fastapi import Depends, HTTPException, Request, Security
from fastapi.security import APIKeyHeader
from supabase import Client, create_client

from app.config import Settings, settings

api_key_header = APIKeyHeader(name="x-api-key", auto_error=False)


def get_settings() -> Settings:
    return settings


def get_supabase(s: Settings = Depends(get_settings)) -> Client:
    if not s.supabase_url or not s.supabase_service_key:
        raise HTTPException(status_code=503, detail="Supabase not configured")
    return create_client(s.supabase_url, s.supabase_service_key)


def verify_api_key(
    key: str | None = Security(api_key_header),
    s: Settings = Depends(get_settings),
) -> str:
    if not s.job_api_key or not key or key != s.job_api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return key


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
    if s.job_api_key and key == s.job_api_key:
        return "api-key"
    if s.admin_session_secret and len(s.admin_session_secret) >= 32:
        token = _extract_bearer_token(request)
        if token:
            try:
                payload = jwt.decode(
                    token,
                    s.admin_session_secret,
                    algorithms=["HS256"],
                )
            except jwt.PyJWTError:
                pass
            else:
                if payload.get("sub") == "tools-admin":
                    return "session"
    raise HTTPException(status_code=401, detail="Unauthorized")
