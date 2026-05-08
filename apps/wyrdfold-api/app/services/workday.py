import logging

from app.http_client import FetchExhaustedError, request_with_retry
from app.services.standard_job import StandardJob

logger = logging.getLogger(__name__)

MAX_JOBS = 200
PAGE_SIZE = 20


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

    all_jobs: list[StandardJob] = []
    offset = 0

    while offset < MAX_JOBS:
        try:
            resp = await request_with_retry(
                "POST",
                url,
                json={
                    "appliedFacets": {},
                    "limit": PAGE_SIZE,
                    "offset": offset,
                    "searchText": "",
                },
            )
        except FetchExhaustedError as exc:
            logger.warning(
                "workday fetch exhausted retries for %s (offset %d): %s",
                board_token,
                offset,
                exc,
            )
            return all_jobs

        if resp.status_code != 200:
            logger.warning(
                "workday %s returned %d at offset %d",
                board_token,
                resp.status_code,
                offset,
            )
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
        offset += PAGE_SIZE
        if offset >= total:
            break

    return all_jobs
