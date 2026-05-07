import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.config import settings
from app.observability import init_sentry
from app.routers import run_scan as run_scan_router
from app.schemas import HealthResponse
from app.services.browser_pool import get_browser_pool
from app.services.scan_queue import get_queue

_log = logging.getLogger("app")

if not settings.allowed_hosts_list:
    raise RuntimeError(
        "ALLOWED_HOSTS must be set (comma-separated host allowlist). "
        "Use '*' only in local dev."
    )

init_sentry()


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    queue = get_queue()
    queue.start()
    try:
        yield
    finally:
        await queue.stop()
        await get_browser_pool().shutdown()


app = FastAPI(
    title="Audit Scan API",
    description="Runs Lighthouse + axe scans, grades results, serves reports",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.allowed_hosts_list,
)


@app.exception_handler(Exception)
async def _unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Log full traceback and return a JSON 500.

    Without this, Starlette's default handler returns plain-text
    "Internal Server Error", which trips JSON-only callers (the Next.js
    BFF). Verbose detail is gated on non-production environments —
    production gets a generic body so SQL fragments, file paths, or
    secrets in stringified exceptions don't leak. Mirrors the
    wyrdfold-api pattern.
    """
    if isinstance(exc, HTTPException):
        raise exc

    _log.exception("unhandled exception on %s %s", request.method, request.url.path)
    is_production = settings.sentry_environment == "production"
    body: dict[str, str] = {
        "detail": "Internal server error"
        if is_production
        else f"{type(exc).__name__}: {exc}",
        "path": request.url.path,
    }
    return JSONResponse(status_code=500, content=body)


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    queue = get_queue()
    return HealthResponse(status="ok", queue=queue.size, running=queue.running)


app.include_router(run_scan_router.router)
