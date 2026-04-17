from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.config import settings
from app.routers import run_scan as run_scan_router
from app.schemas import HealthResponse
from app.services.scan_queue import get_queue

if not settings.allowed_hosts_list:
    raise RuntimeError(
        "ALLOWED_HOSTS must be set (comma-separated host allowlist). "
        "Use '*' only in local dev."
    )


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    queue = get_queue()
    queue.start()
    try:
        yield
    finally:
        await queue.stop()


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


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    queue = get_queue()
    return HealthResponse(status="ok", queue=queue.size, running=queue.running)


app.include_router(run_scan_router.router)
