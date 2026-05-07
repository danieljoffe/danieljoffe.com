import hmac
import logging
from functools import lru_cache
from typing import TYPE_CHECKING

import jwt
from fastapi import Depends, HTTPException, Request, Security
from fastapi.security import APIKeyHeader
from jwt import PyJWKClient, PyJWKClientError
from supabase import Client

from app.config import Settings, settings

logger = logging.getLogger(__name__)

if TYPE_CHECKING:
    from app.services.embeddings.client import EmbeddingsClient
    from app.services.llm.client import LLMClient

api_key_header = APIKeyHeader(name="x-api-key", auto_error=False)

# Algorithms accepted for Supabase JWT verification. Supabase migrated to
# ES256 by default; older projects on RS256 still verify cleanly.
_JWT_ALGORITHMS = ["ES256", "RS256"]


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


def _jwks_url(s: Settings) -> str:
    return f"{s.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"


def _issuer(s: Settings) -> str:
    return f"{s.supabase_url.rstrip('/')}/auth/v1"


@lru_cache(maxsize=4)
def _get_jwks_client_for_url(url: str) -> PyJWKClient:
    """LRU-cached PyJWKClient construction keyed by JWKS URL.

    `lru_cache(maxsize=4)` bounds memory in long-lived test processes
    that construct fresh `Settings` per run — without the bound, the
    cache would grow unbounded across `Settings` instances even though
    the URL set is tiny in practice (1–2 distinct values).

    PyJWKClient itself handles JWKS fetching, response caching (5-minute
    TTL by default), and per-key LRU caching internally. On unknown
    `kid` it auto-refreshes the JWKS and retries before raising — key
    rotation is transparent.
    """
    return PyJWKClient(
        url,
        cache_jwk_set=True,
        lifespan=300,
        max_cached_keys=16,
        timeout=10,
    )


def _get_jwks_client(s: Settings) -> PyJWKClient:
    return _get_jwks_client_for_url(_jwks_url(s))


def _decode_supabase_jwt(token: str, s: Settings) -> dict[str, object]:
    """Verify a Supabase access token against the project's JWKS.

    Raises ``HTTPException(401)`` on any verification failure. ``sub`` and
    ``exp`` are required so the token always identifies an account and a
    deadline. ``aud`` and ``iss`` claims are validated against the project.
    """
    try:
        signing_key = _get_jwks_client(s).get_signing_key_from_jwt(token)
    except (PyJWKClientError, jwt.PyJWTError) as exc:
        # PyJWKClientError: unknown kid (after refresh), JWKS unreachable,
        # malformed JWKS response. PyJWTError: malformed token (not enough
        # segments, bad base64, bad UTF-8 in header) — get_signing_key_from_jwt
        # parses the token header and re-raises decode errors. All collapse
        # to 401 — never leak parser/network detail to the client.
        raise HTTPException(status_code=401, detail="Invalid auth token") from exc

    try:
        payload: dict[str, object] = jwt.decode(
            token,
            signing_key.key,
            algorithms=_JWT_ALGORITHMS,
            options={"require": ["exp", "sub"]},
            audience=s.supabase_jwt_audience,
            issuer=_issuer(s),
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
    if not s.supabase_url:
        raise HTTPException(status_code=503, detail="JWT auth not configured")
    token = _extract_bearer_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Missing auth token")
    payload = _decode_supabase_jwt(token, s)
    return str(payload["sub"])


def verify_api_key_or_jwt(
    request: Request,
    key: str | None = Security(api_key_header),
    s: Settings = Depends(get_settings),
) -> str:
    """Accept either the shared API key (cron) or a Supabase JWT (user).

    JWT decode failures are logged at WARNING (no token detail) so a
    spike of invalid tokens is detectable in observability — the
    previous silent swallow was a detection blind spot.
    """
    if _api_key_matches(key, s.wyrdfold_api_key):
        return "api-key"
    if s.supabase_url:
        token = _extract_bearer_token(request)
        if token:
            try:
                _decode_supabase_jwt(token, s)
            except HTTPException as exc:
                logger.warning(
                    "auth_jwt_decode_failed path=%s reason=%s",
                    request.url.path,
                    exc.detail,
                )
            else:
                return "jwt"
    raise HTTPException(status_code=401, detail="Unauthorized")


def _try_decode_jwt_sub(request: Request, s: Settings) -> str | None:
    """Return the JWT `sub` if a valid Bearer token is present, else None.

    Decode failures are logged at WARNING — see `verify_api_key_or_jwt`
    for rationale.
    """
    if not s.supabase_url:
        return None
    token = _extract_bearer_token(request)
    if not token:
        return None
    try:
        payload = _decode_supabase_jwt(token, s)
    except HTTPException as exc:
        logger.warning(
            "auth_jwt_decode_failed path=%s reason=%s",
            request.url.path,
            exc.detail,
        )
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


def enforce_llm_budget(
    user_id: str | None = Depends(get_current_user_id_optional),
    supabase: Client = Depends(get_supabase),
    s: Settings = Depends(get_settings),
) -> None:
    """Defense-in-depth budget gate for LLM-touching routes.

    JWT users get checked against rolling daily/hourly cost caps from
    `llm_costs`. API-key callers (cron/poller/batch) bypass — those
    system paths are trusted and gated by the operator. Limits are
    configured via `user_llm_*_budget_usd` settings; 0 disables.
    """
    if user_id is None:
        return
    from app.services.llm import budget

    budget.check_user_budget(
        supabase,
        user_id=user_id,
        daily_limit_usd=s.user_llm_daily_budget_usd,
        hourly_limit_usd=s.user_llm_hourly_budget_usd,
    )
