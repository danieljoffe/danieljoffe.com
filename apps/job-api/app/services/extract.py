"""Job metadata extraction from URLs (#500).

Three-tier extraction cascade:
  1. JSON-LD structured data (gold standard)
  2. HTML meta/OG tags + heuristics (fallback)
  3. Firecrawl for JS-rendered pages (gated behind API key)
"""

import logging
import re
from urllib.parse import urlparse

from bs4 import BeautifulSoup
from pydantic import BaseModel

from app.services.jsonld import (
    _extract_jobs,
    _format_salary,
    _get_location,
    _get_str,
)

logger = logging.getLogger(__name__)

MANUAL_SOURCE_ID = "00000000-0000-4000-a000-000000000001"

# Patterns for finding job description content areas.
# Matches BEM (job__description), kebab (job-description), and plain (jobdescription).
_JOB_CONTENT_SELECTORS = [
    {"class_": re.compile(r"job[-_]*description", re.I)},
    {"class_": re.compile(r"job[-_]*details", re.I)},
    {"class_": re.compile(r"job[-_]*post[-_]*container", re.I)},
    {"class_": re.compile(r"responsibilities", re.I)},
    {"class_": re.compile(r"qualifications", re.I)},
    {"id": re.compile(r"job[-_]*description", re.I)},
    {"id": re.compile(r"job[-_]*details", re.I)},
]


class ExtractionResult(BaseModel):
    title: str | None = None
    company_name: str | None = None
    location: str | None = None
    description_html: str | None = None
    salary_text: str | None = None
    tier: str = "none"  # "jsonld" | "html_meta" | "firecrawl" | "none"
    warnings: list[str] = []


# Matches common salary range patterns like "$120,000 - $150,000/yr", "$120k-$150k"
_SALARY_RE = re.compile(
    r"\$\s*[\d,]+(?:\.\d+)?[kK]?"  # first amount
    r"\s*[-–—to]+\s*"  # separator
    r"\$?\s*[\d,]+(?:\.\d+)?[kK]?"  # second amount
    r"(?:\s*/?\s*(?:yr|year|annually|per\s+year|hr|hour|hourly|per\s+hour))?"  # unit
    , re.I
)


def extract_salary_from_text(text: str) -> str | None:
    """Best-effort salary extraction from plain text via regex."""
    m = _SALARY_RE.search(text)
    return m.group(0).strip() if m else None


def _company_from_domain(url: str) -> str:
    """Derive a company name from a URL's hostname.

    Examples: jobs.stripe.com → Stripe, careers.google.com → Google
    """
    hostname = urlparse(url).hostname or ""
    parts = hostname.lower().split(".")
    # Skip common prefixes
    skip = {"www", "jobs", "careers", "boards", "apply", "hire", "recruiting"}
    for part in parts:
        if part not in skip and len(part) > 1:
            return part.capitalize()
    # Fallback: second-level domain
    if len(parts) >= 2:
        return parts[-2].capitalize()
    return hostname


def _extract_from_jsonld(html: str) -> ExtractionResult | None:
    """Tier 1: Extract job metadata from JSON-LD structured data."""
    postings = _extract_jobs(html)
    if not postings:
        return None

    posting = postings[0]
    title = _get_str(posting, "title") or _get_str(posting, "jobTitle")
    if not title:
        return None

    description = _get_str(posting, "description")
    location = _get_location(posting)

    company = None
    org = posting.get("hiringOrganization")
    if isinstance(org, dict):
        company = _get_str(org, "name")

    salary = _format_salary(posting)
    if not salary and description:
        salary = extract_salary_from_text(description)

    return ExtractionResult(
        title=title,
        company_name=company or None,
        location=location,
        description_html=description or None,
        salary_text=salary,
        tier="jsonld",
    )


def _meta_content(soup: BeautifulSoup, prop: str) -> str | None:
    """Safely extract string content from a <meta property=...> tag."""
    tag = soup.find("meta", attrs={"property": prop})
    if tag:
        val = tag.get("content")
        if isinstance(val, str) and val.strip():
            return val.strip()
    return None


def _meta_name_content(soup: BeautifulSoup, name: str) -> str | None:
    """Safely extract string content from a <meta name=...> tag."""
    tag = soup.find("meta", attrs={"name": name})
    if tag:
        val = tag.get("content")
        if isinstance(val, str) and val.strip():
            return val.strip()
    return None


def _extract_from_html_meta(html: str, url: str) -> ExtractionResult | None:
    """Tier 2: Extract job metadata from OG tags and HTML heuristics."""
    soup = BeautifulSoup(html, "html.parser")

    # Title: og:title → <title>
    title = _meta_content(soup, "og:title")
    if not title:
        title_tag = soup.find("title")
        if title_tag and title_tag.string:
            title = title_tag.string.strip()

    if not title:
        return None

    # Company: og:site_name → domain
    company = _meta_content(soup, "og:site_name")
    if not company:
        company = _company_from_domain(url)

    # Description: content area → og:description → meta description
    description = None
    for selector in _JOB_CONTENT_SELECTORS:
        el = soup.find(**selector)  # type: ignore[call-overload]
        if el:
            description = str(el)
            break
    if not description:
        description = _meta_content(soup, "og:description")
    if not description:
        description = _meta_name_content(soup, "description")

    # Location: og:locale or leave None
    location: str | None = None
    locale_val = _meta_content(soup, "og:locale")
    if locale_val and locale_val != "en_US":
        location = locale_val

    return ExtractionResult(
        title=title,
        company_name=company or None,
        location=location,
        description_html=description or None,
        tier="html_meta",
    )


async def _extract_from_firecrawl(url: str) -> ExtractionResult:
    """Tier 3: Use Firecrawl API for JS-rendered pages (gated).

    Always returns ExtractionResult. On failure, tier="none" and warnings
    explain why so the caller can surface them to the user.
    """
    from app.config import settings

    if not settings.firecrawl_api_key:
        return ExtractionResult(tier="none", warnings=["firecrawl_unavailable"])

    try:
        from app.http_client import get_http_client

        client = get_http_client()
        resp = await client.post(
            "https://api.firecrawl.dev/v2/scrape",
            json={"url": url, "formats": ["html"]},
            headers={"Authorization": f"Bearer {settings.firecrawl_api_key}"},
            timeout=30.0,
        )
        if resp.status_code != 200:
            return ExtractionResult(
                tier="none", warnings=[f"firecrawl_failed:http_{resp.status_code}"]
            )

        data = resp.json().get("data", {})
        fc_html = data.get("html", "")
        if not fc_html:
            return ExtractionResult(tier="none", warnings=["firecrawl_failed:empty_html"])

        # Run tiers 1+2 on the Firecrawl-rendered HTML
        result = _extract_from_jsonld(fc_html) or _extract_from_html_meta(fc_html, url)
        if result:
            result.tier = "firecrawl"
            return result
        return ExtractionResult(tier="none", warnings=["firecrawl_failed:no_metadata"])

    except Exception:
        logger.exception("Firecrawl extraction failed for %s", url)
        return ExtractionResult(tier="none", warnings=["firecrawl_failed:exception"])


def extract_job_from_html(html: str, url: str) -> ExtractionResult:
    """Run the synchronous extraction tiers (1 + 2) on pre-fetched HTML.

    Tier 3 (Firecrawl) requires async and a separate fetch, so it is
    handled by the caller when tiers 1+2 fail.
    """
    # Tier 1: JSON-LD
    result = _extract_from_jsonld(html)
    if result:
        return result

    # Tier 2: HTML meta/OG heuristics
    result = _extract_from_html_meta(html, url)
    if result:
        return result

    # Nothing found
    return ExtractionResult(
        tier="none",
        warnings=["extraction_failed:no_metadata_found"],
    )
