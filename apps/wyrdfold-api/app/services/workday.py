import httpx

from app.http_client import get_http_client
from app.services.standard_job import StandardJob

MAX_JOBS = 200


async def fetch_workday_jobs(board_token: str) -> list[StandardJob]:
    """Fetch jobs from Workday's internal CXS API.

    board_token format: "{base_url}|{tenant}|{site}"
    e.g. "https://salesforce.wd12.myworkdayjobs.com|salesforce|External_Career_Site"
    """
    parts = board_token.split("|")
    if len(parts) != 3:
        return []

    base_url, tenant, site = parts
    url = f"{base_url}/wday/cxs/{tenant}/{site}/jobs"

    client = get_http_client()
    all_jobs: list[StandardJob] = []
    offset = 0

    while offset < MAX_JOBS:
        try:
            resp = await client.post(
                url,
                json={
                    "appliedFacets": {},
                    "limit": 20,
                    "offset": offset,
                    "searchText": "",
                },
            )
            if resp.status_code != 200:
                return all_jobs
        except httpx.HTTPError:
            return all_jobs

        data = resp.json()
        postings = data.get("jobPostings", [])
        if not postings:
            break

        for item in postings:
            external_path = item.get("externalPath", "")
            all_jobs.append(
                StandardJob(
                    external_id=external_path or str(item.get("bulletFields", [""])[0]),
                    title=item.get("title", ""),
                    location_name=item.get("locationsText"),
                    department=None,
                    content=item.get("descriptionTeaser", ""),
                    updated_at=item.get("postedOn", ""),
                    absolute_url=f"{base_url}/job/{external_path}" if external_path else "",
                )
            )

        total = data.get("total", 0)
        offset += 20
        if offset >= total:
            break

    return all_jobs
