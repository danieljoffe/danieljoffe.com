import logging
import time
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.gzip import GZipMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from starlette.types import Receive, Scope, Send

from app.config import settings
from app.http_client import close_http_client
from app.routers import (
    analysis,
    experience,
    insights,
    jobs,
    poll,
    sources,
    status,
    tailor,
    targets,
    user_profile,
)
from app.supabase_pool import close_supabase, init_supabase

_log = logging.getLogger("app")

if not settings.allowed_hosts_list:
    raise RuntimeError(
        "ALLOWED_HOSTS must be set (comma-separated host allowlist). Use '*' only in local dev."
    )


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    init_supabase()
    try:
        yield
    finally:
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


@app.exception_handler(Exception)
async def _unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Log full traceback and return a JSON 500.

    Without this, Starlette's default handler returns plain-text
    ``Internal Server Error``, which trips the proxy's non-JSON branch.
    """
    _log.exception("unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={
            "detail": f"{type(exc).__name__}: {exc}",
            "path": request.url.path,
        },
    )


app.include_router(analysis.router)
app.include_router(experience.router)
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
