from fastapi import FastAPI
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.config import settings

app = FastAPI(
    title="Audit Scan API",
    description="Runs Lighthouse + axe scans, grades results, serves reports",
    version="0.1.0",
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.allowed_hosts_list or ["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
