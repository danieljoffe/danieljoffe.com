import logging

from app.http_client import FetchExhaustedError, request_with_retry
from app.services.standard_job import StandardJob

logger = logging.getLogger(__name__)

SMARTRECRUITERS_BASE = "https://api.smartrecruiters.com/v1/companies"


async def fetch_smartrecruiters_jobs(company_id: str) -> list[StandardJob]:
    """Fetch jobs from SmartRecruiters' public Posting API."""
    url = f"{SMARTRECRUITERS_BASE}/{company_id}/postings"
    try:
        resp = await request_with_retry("GET", url)
    except FetchExhaustedError as exc:
        logger.warning("smartrecruiters fetch exhausted retries for %s: %s", company_id, exc)
        return []

    if resp.status_code == 404:
        return []
    if resp.status_code >= 400:
        logger.warning("smartrecruiters %s returned %d for %s", company_id, resp.status_code, url)
        return []

    data = resp.json()
    items = data.get("content", [])
    if not isinstance(items, list):
        return []

    jobs: list[StandardJob] = []
    for item in items:
        location = item.get("location", {})
        city = location.get("city", "")
        country = location.get("country", "")
        location_str = f"{city}, {country}".strip(", ") if city or country else None

        department = item.get("department", {})

        company = item.get("company", {})
        job_url = item.get("ref", "")

        jobs.append(
            StandardJob(
                external_id=str(item.get("id", "")),
                title=item.get("name", ""),
                location_name=location_str,
                department=department.get("label") if department else None,
                content=item.get("jobAd", {})
                .get("sections", {})
                .get("jobDescription", {})
                .get("text", ""),
                updated_at=item.get("releasedDate", ""),
                absolute_url=company.get("website", job_url) if company else job_url,
            )
        )
    return jobs
