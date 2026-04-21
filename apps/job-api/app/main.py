from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.config import settings
from app.http_client import close_http_client
from app.routers import jobs, poll, sources, status
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

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.allowed_hosts_list,
)

app.include_router(jobs.router)
app.include_router(poll.router)
app.include_router(sources.router)
app.include_router(status.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
