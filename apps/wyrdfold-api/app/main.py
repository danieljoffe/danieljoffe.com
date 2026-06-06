import logging
import time
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from starlette.types import Receive, Scope, Send

from app.config import Settings, settings
from app.http_client import close_http_client
from app.observability import init_sentry
from app.routers import (
    analysis,
    experience,
    feedback,
    insights,
    jobs,
    poll,
    sources,
    status,
    tailor,
    targets,
    user_profile,
)
from app.scheduler import start_scheduler_if_enabled
from app.services.llm.cost_log_buffer import buffer as cost_log_buffer
from app.services.llm.errors import LLMServiceError
from app.supabase_pool import close_supabase, get_supabase_pool, init_supabase

_log = logging.getLogger("app")

init_sentry()


def _validate_settings(s: Settings) -> None:
    """Fail fast on missing/invalid required settings.

    Called from within ``lifespan`` so the check runs at app startup
    rather than at module import — keeps tests/import order decoupled.
    """
    if not s.allowed_hosts_list:
        raise RuntimeError(
            "ALLOWED_HOSTS must be set (comma-separated host allowlist). Use '*' only in local dev."
        )

    # If the operator selected the real Anthropic provider but didn't
    # configure a key, every LLM-backed request will 500 mid-call with
    # an opaque SDK ``TypeError`` ("Could not resolve authentication
    # method") — and nothing surfaces that misconfig until the first
    # user tries to onboard, derive a target, score a job, etc. Fail
    # the lifespan instead so the deploy logs make the cause obvious.
    if s.llm_provider == "anthropic" and not s.anthropic_api_key:
        raise RuntimeError(
            "LLM_PROVIDER=anthropic but ANTHROPIC_API_KEY is unset. "
            "Either set ANTHROPIC_API_KEY or switch LLM_PROVIDER=mock."
        )

    # Same shape for Voyage embeddings — when the real provider is
    # selected without a key, embedding generation will explode partway
    # through a request flow (re-derive, conversation, etc.).
    if s.embeddings_provider == "voyage" and not s.voyage_api_key:
        raise RuntimeError(
            "EMBEDDINGS_PROVIDER=voyage but VOYAGE_API_KEY is unset. "
            "Either set VOYAGE_API_KEY or switch EMBEDDINGS_PROVIDER=mock."
        )


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    _validate_settings(settings)
    init_supabase()
    scheduler = start_scheduler_if_enabled()
    # Background cost-log flush task. Cron paths enqueue rows and the
    # buffer drains them in a single bulk INSERT every few seconds.
    # Started only when supabase is configured (otherwise enqueued rows
    # would accumulate forever in tests/local dev without a backing DB).
    supabase_for_buffer = get_supabase_pool()
    if supabase_for_buffer is not None:
        cost_log_buffer.start(supabase_for_buffer)
    try:
        yield
    finally:
        if scheduler is not None:
            scheduler.shutdown(wait=False)
        if supabase_for_buffer is not None:
            await cost_log_buffer.stop(supabase_for_buffer)
        close_supabase()
        await close_http_client()


app = FastAPI(
    title="WyrdFold API",
    description="WyrdFold backend — polls Greenhouse boards, scores postings, serves results",
    version="0.1.0",
    lifespan=lifespan,
)


class _HealthBypassTrustedHost(TrustedHostMiddleware):
    """Skip host validation for infrastructure health probes."""

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http" and scope["path"] == "/health":
            await self.app(scope, receive, send)
            return
        await super().__call__(scope, receive, send)


app.add_middleware(
    _HealthBypassTrustedHost,
    allowed_hosts=settings.allowed_hosts_list,
)

# Compress JSON responses ≥1KB. List endpoints can return hundreds of jobs;
# gzip cuts ~70-80% off typical JSON payloads.
app.add_middleware(GZipMiddleware, minimum_size=1024)

# Explicit CORS allowlist (Phase 5 P1-Sec). Empty = no browser-direct
# callers — the Next.js app proxies via server-side fetch and doesn't need
# CORS. Set CORS_ALLOWED_ORIGINS in env when adding browser callers.
if settings.cors_allowed_origins_list:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allowed_origins_list,
        allow_credentials=False,  # we use Bearer JWT, not cookies
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["authorization", "content-type", "x-api-key"],
        max_age=600,
    )


@app.middleware("http")
async def _log_slow_requests(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    """Log requests slower than ``settings.slow_request_threshold_ms``.

    Adds an ``X-Response-Time-Ms`` header on every response so callers can
    correlate without parsing logs.
    """
    started = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - started) * 1000.0

    response.headers["X-Response-Time-Ms"] = f"{duration_ms:.1f}"

    if duration_ms >= settings.slow_request_threshold_ms:
        _log.warning(
            "slow_request method=%s path=%s status=%s duration_ms=%.1f",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
        )
    return response


@app.exception_handler(LLMServiceError)
async def _llm_service_error_handler(
    request: Request, exc: LLMServiceError
) -> JSONResponse:
    """Translate typed LLM provider failures into a user-safe JSON
    response. Sentry breadcrumb keeps the upstream status + provider
    reason searchable without exposing them to end users.

    See ``app/services/llm/errors.py`` for the categorization. All
    cases default to HTTP 503 with a friendly ``detail`` string the
    FE can render via ``extractApiError`` verbatim — no vendor
    messages (e.g. OpenRouter's ``"Insufficient credits..."``) ever
    reach the user.
    """
    _log.warning(
        "llm_service_error path=%s reason=%s upstream_status=%s",
        request.url.path,
        exc.reason,
        exc.upstream_status,
    )
    # ``capture_exception`` is a no-op when Sentry isn't initialized,
    # so the import is cheap and safe in tests.
    try:
        import sentry_sdk

        sentry_sdk.set_tag("llm.reason", exc.reason)
        if exc.upstream_status is not None:
            sentry_sdk.set_tag("llm.upstream_status", str(exc.upstream_status))
        sentry_sdk.capture_exception(exc)
    except ImportError:  # pragma: no cover
        pass
    return JSONResponse(
        status_code=exc.http_status,
        content={"detail": exc.user_message, "code": exc.reason},
    )


@app.exception_handler(Exception)
async def _unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Log full traceback and return a JSON 500.

    Without this, Starlette's default handler returns plain-text
    ``Internal Server Error``, which trips the proxy's non-JSON branch.
    Verbose detail (class name + message) is gated on non-production
    environments — production gets a generic body so SQL fragments,
    file paths, or secrets in stringified exceptions don't leak.
    """
    # FastAPI/Starlette resolves more-specific handlers first, so HTTPException
    # never reaches us. Re-raise defensively in case a future middleware path
    # routes one through Exception.
    from fastapi import HTTPException

    if isinstance(exc, HTTPException):
        raise exc

    _log.exception("unhandled exception on %s %s", request.method, request.url.path)
    is_production = settings.sentry_environment == "production"
    body: dict[str, str] = {
        "detail": "Internal server error" if is_production else f"{type(exc).__name__}: {exc}",
        "path": request.url.path,
    }
    return JSONResponse(status_code=500, content=body)


app.include_router(analysis.router)
app.include_router(experience.router)
app.include_router(feedback.router)
app.include_router(insights.router)
app.include_router(jobs.router)
app.include_router(poll.router)
app.include_router(sources.router)
app.include_router(status.router)
app.include_router(tailor.router)
app.include_router(targets.router)
app.include_router(user_profile.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
