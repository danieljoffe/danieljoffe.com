import logging

from app.http_client import FetchExhaustedError, request_with_retry
from app.services.standard_job import StandardJob

logger = logging.getLogger(__name__)

ASHBY_BASE = "https://api.ashbyhq.com/posting-api/job-board"


async def fetch_ashby_jobs(slug: str) -> list[StandardJob]:
    url = f"{ASHBY_BASE}/{slug}"
    try:
        resp = await request_with_retry("GET", url)
    except FetchExhaustedError as exc:
        logger.warning("ashby fetch exhausted retries for %s: %s", slug, exc)
        return []

    if resp.status_code == 404:
        return []
    if resp.status_code >= 400:
        logger.warning("ashby %s returned %d for %s", slug, resp.status_code, url)
        return []

    data = resp.json()
    raw_jobs = data.get("jobs", [])
    if not isinstance(raw_jobs, list):
        return []

    jobs: list[StandardJob] = []
    for item in raw_jobs:
        jobs.append(
            StandardJob(
                external_id=str(item["id"]),
                title=item.get("title", ""),
                location_name=item.get("location"),
                department=item.get("department"),
                content=item.get("descriptionHtml", ""),
                updated_at=item.get("publishedAt", ""),
                absolute_url=item.get("jobUrl", ""),
            )
        )
    return jobs
