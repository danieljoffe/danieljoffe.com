import httpx

from app.http_client import get_http_client
from app.services.standard_job import StandardJob

ASHBY_BASE = "https://api.ashbyhq.com/posting-api/job-board"


async def fetch_ashby_jobs(slug: str) -> list[StandardJob]:
    url = f"{ASHBY_BASE}/{slug}"
    client = get_http_client()
    try:
        resp = await client.get(url)
        if resp.status_code == 404:
            return []
        resp.raise_for_status()
    except httpx.HTTPError:
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
