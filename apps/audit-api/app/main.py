from fastapi import FastAPI
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.config import settings

if not settings.allowed_hosts_list:
    raise RuntimeError(
        "ALLOWED_HOSTS must be set (comma-separated host allowlist). "
        "Use '*' only in local dev."
    )

app = FastAPI(
    title="Audit Scan API",
    description="Runs Lighthouse + axe scans, grades results, serves reports",
    version="0.1.0",
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.allowed_hosts_list,
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
