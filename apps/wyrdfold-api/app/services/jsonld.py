import json
import re
from html.parser import HTMLParser

import httpx

from app.http_client import get_http_client
from app.services.standard_job import StandardJob


class _JsonLdExtractor(HTMLParser):
    """Extract JSON-LD script blocks from HTML."""

    def __init__(self) -> None:
        super().__init__()
        self._in_jsonld = False
        self._buf = ""
        self.blocks: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "script":
            attr_dict = dict(attrs)
            if attr_dict.get("type") == "application/ld+json":
                self._in_jsonld = True
                self._buf = ""

    def handle_data(self, data: str) -> None:
        if self._in_jsonld:
            self._buf += data

    def handle_endtag(self, tag: str) -> None:
        if tag == "script" and self._in_jsonld:
            self._in_jsonld = False
            self.blocks.append(self._buf)


def _extract_jobs(html: str) -> list[dict[str, object]]:
    """Parse HTML for JSON-LD blocks and return all JobPosting objects."""
    parser = _JsonLdExtractor()
    parser.feed(html)

    postings: list[dict[str, object]] = []
    for block in parser.blocks:
        try:
            data = json.loads(block)
        except (json.JSONDecodeError, ValueError):
            continue

        if isinstance(data, list):
            for item in data:
                if isinstance(item, dict) and _is_job_posting(item):
                    postings.append(item)
        elif isinstance(data, dict):
            if _is_job_posting(data):
                postings.append(data)
            # Handle @graph arrays
            graph = data.get("@graph")
            if isinstance(graph, list):
                for item in graph:
                    if isinstance(item, dict) and _is_job_posting(item):
                        postings.append(item)

    return postings


def _is_job_posting(obj: dict[str, object]) -> bool:
    obj_type = obj.get("@type", "")
    if isinstance(obj_type, list):
        return "JobPosting" in obj_type
    return obj_type == "JobPosting"


def _get_location(posting: dict[str, object]) -> str | None:
    loc = posting.get("jobLocation")
    if isinstance(loc, dict):
        address = loc.get("address")
        if isinstance(address, dict):
            parts = [
                address.get("addressLocality", ""),
                address.get("addressRegion", ""),
            ]
            return ", ".join(p for p in parts if p) or None
        return loc.get("name") if isinstance(loc.get("name"), str) else None
    if isinstance(loc, list) and loc:
        first = loc[0]
        if isinstance(first, dict):
            address = first.get("address")
            if isinstance(address, dict):
                parts = [
                    address.get("addressLocality", ""),
                    address.get("addressRegion", ""),
                ]
                return ", ".join(p for p in parts if p) or None
    return None


def _get_str(obj: dict[str, object], key: str) -> str:
    val = obj.get(key, "")
    return str(val) if val else ""


_HTML_TAG_RE = re.compile(r"<[^>]+>")


def _format_salary(posting: dict[str, object]) -> str | None:
    """Extract baseSalary from a JSON-LD JobPosting and format as readable text."""
    base = posting.get("baseSalary")
    if not base:
        return None

    if isinstance(base, (int, float)):
        return f"${base:,.0f}"

    if not isinstance(base, dict):
        return None

    currency = str(base.get("currency", "USD"))
    symbol = "$" if currency == "USD" else f"{currency} "
    value = base.get("value")

    if isinstance(value, (int, float)):
        return f"{symbol}{value:,.0f}"

    if isinstance(value, dict):
        min_val = value.get("minValue")
        max_val = value.get("maxValue")
        unit = str(value.get("unitText", "")).upper()
        suffix = "/yr" if unit == "YEAR" else "/hr" if unit == "HOUR" else ""

        if min_val is not None and max_val is not None:
            return f"{symbol}{float(min_val):,.0f} – {symbol}{float(max_val):,.0f}{suffix}"
        if min_val is not None:
            return f"From {symbol}{float(min_val):,.0f}{suffix}"
        if max_val is not None:
            return f"Up to {symbol}{float(max_val):,.0f}{suffix}"
        # Single value field
        single = value.get("value")
        if single is not None:
            return f"{symbol}{float(single):,.0f}{suffix}"

    return None


async def fetch_jsonld_jobs(careers_url: str) -> list[StandardJob]:
    """Fetch a careers page and extract jobs from JSON-LD markup."""
    client = get_http_client()
    try:
        resp = await client.get(careers_url)
        if resp.status_code != 200:
            return []
    except httpx.HTTPError:
        return []

    postings = _extract_jobs(resp.text)

    jobs: list[StandardJob] = []
    for posting in postings:
        title = _get_str(posting, "title") or _get_str(posting, "jobTitle")
        if not title:
            continue

        description = _get_str(posting, "description")
        # Strip HTML from description if present
        clean_desc = _HTML_TAG_RE.sub("", description) if "<" in description else description

        url = _get_str(posting, "url") or _get_str(posting, "sameAs")

        # Build a stable ID from URL or title hash
        import hashlib

        id_source = url or f"{title}|{_get_location(posting) or ''}"
        external_id = hashlib.sha256(id_source.encode()).hexdigest()[:16]

        org = posting.get("hiringOrganization")
        dept = ""
        if isinstance(org, dict):
            dept = _get_str(org, "department")

        jobs.append(
            StandardJob(
                external_id=external_id,
                title=title,
                location_name=_get_location(posting),
                department=dept or None,
                content=clean_desc,
                updated_at=_get_str(posting, "datePosted"),
                absolute_url=url,
                salary_text=_format_salary(posting),
            )
        )

    return jobs
