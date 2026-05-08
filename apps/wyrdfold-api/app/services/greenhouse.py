import logging

from app.http_client import FetchExhaustedError, request_with_retry
from app.services.standard_job import StandardJob

logger = logging.getLogger(__name__)

GREENHOUSE_BASE = "https://boards-api.greenhouse.io/v1/boards"


async def fetch_board_jobs(board_token: str) -> list[StandardJob]:
    url = f"{GREENHOUSE_BASE}/{board_token}/jobs?content=true"
    try:
        resp = await request_with_retry("GET", url)
    except FetchExhaustedError as exc:
        logger.warning("greenhouse fetch exhausted retries for %s: %s", board_token, exc)
        return []

    if resp.status_code == 404:
        return []
    if resp.status_code >= 400:
        logger.warning("greenhouse %s returned %d for %s", board_token, resp.status_code, url)
        return []

    data = resp.json()
    jobs: list[StandardJob] = []
    for item in data.get("jobs", []):
        location = item.get("location", {})
        departments = item.get("departments", [])
        jobs.append(
            StandardJob(
                external_id=str(item["id"]),
                title=item.get("title", ""),
                location_name=location.get("name") if location else None,
                department=departments[0]["name"] if departments else None,
                content=item.get("content", ""),
                updated_at=item.get("updated_at", ""),
                absolute_url=item.get("absolute_url", ""),
            )
        )
    return jobs
