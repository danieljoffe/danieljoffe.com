import hashlib
import logging

from app.config import settings
from app.http_client import FetchExhaustedError, request_with_retry
from app.services.standard_job import StandardJob

logger = logging.getLogger(__name__)

FIRECRAWL_SCRAPE_URL = "https://api.firecrawl.dev/v2/scrape"

# JSON schema sent to Firecrawl's LLM extraction.  Defines the shape we
# expect back — an array of job objects with the fields we need.
_EXTRACT_SCHEMA: dict[str, object] = {
    "type": "object",
    "properties": {
        "jobs": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Job title"},
                    "location": {
                        "type": "string",
                        "description": "Job location (city, state, remote, etc.)",
                    },
                    "department": {
                        "type": "string",
                        "description": "Department or team name",
                    },
                    "url": {
                        "type": "string",
                        "description": "Direct URL to the individual job posting",
                    },
                    "description": {
                        "type": "string",
                        "description": "Job description or summary text",
                    },
                },
                "required": ["title"],
            },
        },
    },
    "required": ["jobs"],
}

_EXTRACT_PROMPT = (
    "Extract all job listings from this careers page. "
    "For each job, extract the title, location, department or team, "
    "the direct URL to the job posting, and a brief description."
)


def _make_external_id(careers_url: str, title: str, location: str | None) -> str:
    """Generate a stable synthetic ID for a crawled job.

    Since crawl sources have no stable API ID, we hash the source URL +
    title + location to create a consistent identifier for dedup.
    """
    source = f"{careers_url}|{title}|{location or ''}"
    return hashlib.sha256(source.encode()).hexdigest()[:16]


async def fetch_firecrawl_jobs(careers_url: str) -> list[StandardJob]:
    """Scrape a careers page via Firecrawl and extract structured job listings."""
    from app.services.validate import validate_format

    cleaned = validate_format(careers_url)
    if cleaned is None:
        logger.warning("Invalid URL rejected — skipping crawl source %s", careers_url)
        return []
    careers_url = cleaned

    api_key = settings.firecrawl_api_key
    if not api_key:
        logger.warning("FIRECRAWL_API_KEY not set — skipping crawl source %s", careers_url)
        return []

    try:
        resp = await request_with_retry(
            "POST",
            FIRECRAWL_SCRAPE_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "url": careers_url,
                "formats": [
                    {
                        "type": "json",
                        "schema": _EXTRACT_SCHEMA,
                        "prompt": _EXTRACT_PROMPT,
                    }
                ],
            },
            timeout=120.0,
        )
    except FetchExhaustedError as exc:
        logger.warning("firecrawl fetch exhausted retries for %s: %s", careers_url, exc)
        return []

    if resp.status_code != 200:
        logger.warning(
            "Firecrawl returned %d for %s: %s",
            resp.status_code,
            careers_url,
            resp.text[:200],
        )
        return []

    try:
        data = resp.json()
    except ValueError:
        logger.warning("Firecrawl returned non-JSON for %s", careers_url)
        return []

    # Firecrawl v2 response: { "success": true, "data": { "json": { "jobs": [...] } } }
    extracted = data.get("data", {}).get("json", {})
    raw_jobs = extracted.get("jobs", [])
    if not isinstance(raw_jobs, list):
        logger.warning("Firecrawl extraction returned non-list jobs for %s", careers_url)
        return []

    jobs: list[StandardJob] = []
    for item in raw_jobs:
        if not isinstance(item, dict):
            continue
        title = item.get("title", "").strip()
        if not title:
            continue

        location = item.get("location", "").strip() or None
        jobs.append(
            StandardJob(
                external_id=_make_external_id(careers_url, title, location),
                title=title,
                location_name=location,
                department=item.get("department", "").strip() or None,
                content=item.get("description", "").strip(),
                updated_at="",
                absolute_url=item.get("url", "").strip(),
            )
        )

    return jobs
