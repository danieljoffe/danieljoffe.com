import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.middleware.trustedhost import TrustedHostMiddleware
from starlette.types import Receive, Scope, Send

from app.config import settings
from app.http_client import close_http_client

_log = logging.getLogger("app")
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

if not settings.allowed_hosts_list:
    raise RuntimeError(
        "ALLOWED_HOSTS must be set (comma-separated host allowlist). "
        "Use '*' only in local dev."
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
    title="Job Pipeline API",
    description="Polls Greenhouse job boards, scores postings, serves results",
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

@app.exception_handler(Exception)
async def _unhandled_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    """Log full traceback and return a JSON 500.

    Without this, Starlette's default handler returns plain-text
    ``Internal Server Error``, which trips the proxy's non-JSON branch.
    """
    _log.exception(
        "unhandled exception on %s %s", request.method, request.url.path
    )
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
