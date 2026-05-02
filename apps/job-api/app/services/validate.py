"""Job URL validation service (#496).

Four-layer validation: format checks, banned-site filtering,
redirect detection, and content verification.
"""

import re
from urllib.parse import urlparse

import httpx

from app.services.jsonld import _extract_jobs

# ---------------------------------------------------------------------------
# Layer 1 — URL format validation
# ---------------------------------------------------------------------------

_IP_RE = re.compile(r"^\d{1,3}(\.\d{1,3}){3}$")


def validate_format(url: str) -> str | None:
    """Return cleaned URL if valid, None if malformed."""
    cleaned = url.strip()
    if not cleaned:
        return None
    parsed = urlparse(cleaned)
    if parsed.scheme not in ("http", "https"):
        return None
    hostname = parsed.hostname
    if not hostname:
        return None
    if "." not in hostname:
        return None
    if _IP_RE.match(hostname):
        return None
    return cleaned


# ---------------------------------------------------------------------------
# Layer 2 — Banned domains
# ---------------------------------------------------------------------------

BANNED_DOMAINS: frozenset[str] = frozenset(
    {
        # Expired / dead aggregators
        "jobaline.com",
        "jobrapido.com",
        "jobisland.com",
        "careerjet.com",
        "jobisjob.com",
        "neuvoo.com",
        "recruit.net",
        "jobdiagnosis.com",
        "jobvertise.com",
        # Content farms / low-quality aggregators
        "jooble.org",
        "adzuna.com",
        "ziprecruiter.com",
        "snagajob.com",
        "lensa.com",
        "talent.com",
        "whatjobs.com",
        "jobsora.com",
        # Known scam / spam domains
        "earnathome.com",
        "homebasejob.com",
        "easyworkathome.org",
        "onlinejobshub.com",
        "getrichquickjobs.com",
        # Generic job sites that aren't direct postings
        "craigslist.org",
        "facebook.com",
    }
)


def registrable_domain(hostname: str) -> str:
    """Extract the registrable domain (last two parts) from a hostname."""
    parts = hostname.lower().rstrip(".").split(".")
    if len(parts) >= 2:
        return ".".join(parts[-2:])
    return hostname.lower()


def is_banned_domain(hostname: str) -> bool:
    return registrable_domain(hostname) in BANNED_DOMAINS


# ---------------------------------------------------------------------------
# Layer 4 — Content verification
# ---------------------------------------------------------------------------

_APPLY_RE = re.compile(r"<(?:a|button)\b[^>]*>.*?apply.*?</(?:a|button)>", re.I | re.S)
_JOB_CLASS_RE = re.compile(
    r'(?:class|id)\s*=\s*["\'][^"\']*'
    r"(?:job-description|job-details|qualifications|responsibilities)"
    r'[^"\']*["\']',
    re.I,
)
_OG_JOB_RE = re.compile(
    r'<meta\s[^>]*property\s*=\s*["\']og:type["\'][^>]*content\s*=\s*["\'][^"\']*job',
    re.I,
)
_TITLE_RE = re.compile(r"<title[^>]*>(.*?)</title>", re.I | re.S)
_TITLE_KEYWORDS = ("job", "career", "position", "opening", "hiring", "apply")


def _verify_content(html: str) -> tuple[bool, list[str]]:
    """Check whether HTML looks like a job posting page.

    Returns (is_job_page, warnings). Never hard-rejects.
    """
    # Tier 1: JSON-LD (gold standard)
    if _extract_jobs(html):
        return True, []

    # Tier 2: HTML heuristics
    signals = 0
    if _APPLY_RE.search(html):
        signals += 1
    if _JOB_CLASS_RE.search(html):
        signals += 1
    if _OG_JOB_RE.search(html):
        signals += 1
    if signals >= 2:
        return True, []

    # Tier 3: Title keyword check (weakest)
    title_match = _TITLE_RE.search(html)
    if title_match:
        title_text = title_match.group(1).lower()
        if any(kw in title_text for kw in _TITLE_KEYWORDS):
            return True, ["content_verification:title_only"]

    return False, []


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

_VALIDATE_TIMEOUT = 10.0
_MAX_REDIRECTS = 10


from pydantic import BaseModel  # noqa: E402


class ValidationResult(BaseModel):
    is_valid: bool
    final_url: str
    warnings: list[str] = []
    rejection_reason: str | None = None


async def validate_job_url(url: str) -> ValidationResult:
    """Validate a job URL through all four layers."""
    # Layer 1: Format
    cleaned = validate_format(url)
    if cleaned is None:
        return ValidationResult(
            is_valid=False,
            final_url=url,
            rejection_reason="malformed_url",
        )

    # Layer 2: Banned domain (pre-redirect)
    hostname = urlparse(cleaned).hostname or ""
    if is_banned_domain(hostname):
        return ValidationResult(
            is_valid=False,
            final_url=cleaned,
            rejection_reason=f"banned_domain:{registrable_domain(hostname)}",
        )

    # Layer 3: Redirect detection + Layer 4: Content verification
    warnings: list[str] = []
    final_url = cleaned
    html = ""

    try:
        async with httpx.AsyncClient(
            timeout=_VALIDATE_TIMEOUT,
            follow_redirects=True,
            max_redirects=_MAX_REDIRECTS,
        ) as client:
            resp = await client.get(cleaned)

            final_url = str(resp.url)

            # Detect domain change via redirect
            final_hostname = urlparse(final_url).hostname or ""
            if registrable_domain(hostname) != registrable_domain(final_hostname):
                warnings.append(
                    f"redirect_domain_change:"
                    f"{registrable_domain(hostname)}->"
                    f"{registrable_domain(final_hostname)}"
                )

            # Layer 2 again: banned check post-redirect
            if is_banned_domain(final_hostname):
                return ValidationResult(
                    is_valid=False,
                    final_url=final_url,
                    rejection_reason=(
                        f"banned_domain_after_redirect:"
                        f"{registrable_domain(final_hostname)}"
                    ),
                )

            if resp.status_code != 200:
                warnings.append(f"http_status:{resp.status_code}")
            else:
                html = resp.text

    except httpx.TooManyRedirects:
        warnings.append("too_many_redirects")
    except httpx.HTTPError:
        warnings.append("fetch_failed")

    # Layer 4: Content verification (only if we got HTML)
    if html:
        is_job, content_warnings = _verify_content(html)
        warnings.extend(content_warnings)
        if not is_job:
            warnings.append("content_verification:not_a_job_posting")

    return ValidationResult(
        is_valid=True,
        final_url=final_url,
        warnings=warnings,
    )
