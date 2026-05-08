import logging

from app.http_client import FetchExhaustedError, request_with_retry
from app.services.standard_job import StandardJob

logger = logging.getLogger(__name__)

LEVER_BASE = "https://api.lever.co/v0/postings"


async def fetch_lever_jobs(company: str) -> list[StandardJob]:
    url = f"{LEVER_BASE}/{company}?mode=json"
    try:
        resp = await request_with_retry("GET", url)
    except FetchExhaustedError as exc:
        logger.warning("lever fetch exhausted retries for %s: %s", company, exc)
        return []

    if resp.status_code == 404:
        return []
    if resp.status_code >= 400:
        logger.warning("lever %s returned %d for %s", company, resp.status_code, url)
        return []

    data = resp.json()
    if not isinstance(data, list):
        return []

    jobs: list[StandardJob] = []
    for item in data:
        categories = item.get("categories", {})
        jobs.append(
            StandardJob(
                external_id=str(item["id"]),
                title=item.get("text", ""),
                location_name=categories.get("location"),
                department=categories.get("team"),
                content=item.get("description", ""),
                updated_at=str(item.get("createdAt", "")),
                absolute_url=item.get("hostedUrl", ""),
            )
        )
    return jobs
