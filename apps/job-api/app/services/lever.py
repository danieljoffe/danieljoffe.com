import httpx

from app.services.standard_job import StandardJob

LEVER_BASE = "https://api.lever.co/v0/postings"
REQUEST_TIMEOUT = 10.0


async def fetch_lever_jobs(company: str) -> list[StandardJob]:
    url = f"{LEVER_BASE}/{company}?mode=json"
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
        try:
            resp = await client.get(url)
            if resp.status_code == 404:
                return []
            resp.raise_for_status()
        except httpx.HTTPError:
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
