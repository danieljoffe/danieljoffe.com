import httpx

from app.http_client import get_http_client
from app.services.standard_job import StandardJob

SMARTRECRUITERS_BASE = "https://api.smartrecruiters.com/v1/companies"


async def fetch_smartrecruiters_jobs(company_id: str) -> list[StandardJob]:
    """Fetch jobs from SmartRecruiters' public Posting API."""
    url = f"{SMARTRECRUITERS_BASE}/{company_id}/postings"
    client = get_http_client()
    try:
        resp = await client.get(url)
        if resp.status_code == 404:
            return []
        resp.raise_for_status()
    except httpx.HTTPError:
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
