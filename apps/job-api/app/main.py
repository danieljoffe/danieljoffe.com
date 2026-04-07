from fastapi import FastAPI

from app.routers import jobs, poll, sources, status

app = FastAPI(
    title="Job Pipeline API",
    description="Polls Greenhouse job boards, scores postings, serves results",
    version="0.1.0",
)

app.include_router(jobs.router)
app.include_router(poll.router)
app.include_router(sources.router)
app.include_router(status.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
