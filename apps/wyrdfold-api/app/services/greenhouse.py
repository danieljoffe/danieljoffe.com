import httpx

from app.http_client import get_http_client
from app.services.standard_job import StandardJob

GREENHOUSE_BASE = "https://boards-api.greenhouse.io/v1/boards"


async def fetch_board_jobs(board_token: str) -> list[StandardJob]:
    url = f"{GREENHOUSE_BASE}/{board_token}/jobs?content=true"
    client = get_http_client()
    try:
        resp = await client.get(url)
        if resp.status_code == 404:
            return []
        resp.raise_for_status()
    except httpx.HTTPError:
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
