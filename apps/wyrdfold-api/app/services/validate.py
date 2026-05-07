"""Job URL validation service (#496).

Four-layer validation: format checks, banned-site filtering,
redirect detection, and content verification.

Includes SSRF defense: hostnames are resolved pre-fetch and rejected if
ANY resolved address is in a private / loopback / link-local / cloud-
metadata range. IPv6 literals and bare IPv4 literals are blocked at the
format layer. (Phase 5 P0-Sec-3.)
"""

import ipaddress
import logging
import re
import socket
from urllib.parse import urlparse

import httpx

from app.services.jsonld import _extract_jobs

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Layer 1 — URL format validation
# ---------------------------------------------------------------------------

_IPV4_RE = re.compile(r"^\d{1,3}(\.\d{1,3}){3}$")


def validate_format(url: str) -> str | None:
    """Return cleaned URL if valid, None if malformed.

    Rejects IPv4/IPv6 literals up-front — legitimate job postings live on
    real hostnames. This also blocks the most direct SSRF inputs without
    needing DNS resolution.
    """
    cleaned = url.strip()
    if not cleaned:
        return None
    parsed = urlparse(cleaned)
    if parsed.scheme not in ("http", "https"):
        return None
    hostname = parsed.hostname
    if not hostname:
        return None
    # Reject IPv6 literals (`urlparse` strips the brackets in `.hostname`).
    if ":" in hostname:
        return None
    if "." not in hostname:
        return None
    if _IPV4_RE.match(hostname):
        return None
    return cleaned


# ---------------------------------------------------------------------------
# SSRF defense — resolve the hostname and reject private/internal ranges.
# ---------------------------------------------------------------------------


def _is_disallowed_address(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    """Return True if *ip* falls in any range we refuse to fetch from.

    Covers loopback, link-local (incl. 169.254.169.254 cloud metadata),
    RFC1918 private, IPv4-mapped IPv6, ULA (fc00::/7), and the all-zeros
    block. Also blocks reserved / multicast / unspecified for safety —
    none of those are valid HTTP origins for a public job posting.
    """
    if ip.is_loopback or ip.is_link_local or ip.is_private:
        return True
    if ip.is_multicast or ip.is_unspecified or ip.is_reserved:
        return True
    # IPv4-mapped (::ffff:x.x.x.x) and IPv4-compat — re-check the
    # embedded v4 against the v4 ranges.
    return (
        isinstance(ip, ipaddress.IPv6Address)
        and ip.ipv4_mapped is not None
        and _is_disallowed_address(ip.ipv4_mapped)
    )


def _resolve_addresses(
    hostname: str,
) -> list[ipaddress.IPv4Address | ipaddress.IPv6Address]:
    """Resolve *hostname* to all addresses (A + AAAA). Raises socket.gaierror
    if resolution fails. Empty result = unresolvable; caller treats as reject.
    """
    try:
        infos = socket.getaddrinfo(hostname, None)
    except socket.gaierror:
        return []
    seen: set[str] = set()
    out: list[ipaddress.IPv4Address | ipaddress.IPv6Address] = []
    for info in infos:
        sockaddr = info[4]
        # sockaddr[0] is typed as `str | int` in stubs (some address families
        # use ints). For AF_INET / AF_INET6 it's always a string — coerce
        # defensively rather than narrowing on family.
        addr_str = str(sockaddr[0])
        if addr_str in seen:
            continue
        seen.add(addr_str)
        try:
            out.append(ipaddress.ip_address(addr_str))
        except ValueError:
            continue
    return out


def assert_safe_host(hostname: str) -> None:
    """Raise ValueError if *hostname* resolves to a disallowed address.

    Defense against SSRF: a hostname like ``metadata.evil.com`` may
    legitimately resolve to ``169.254.169.254`` (AWS/GCP metadata),
    which would otherwise leak service-role credentials reachable from
    the FastAPI host. Call this before any outbound fetch of a
    user-supplied URL.

    Note: this does not protect against DNS rebinding (the resolver may
    return a new IP between this check and the `httpx` socket connect).
    Full mitigation requires pinning the resolved IP at request time;
    pre-resolution + sane caching covers the common case.
    """
    addrs = _resolve_addresses(hostname)
    if not addrs:
        raise ValueError(f"hostname did not resolve: {hostname}")
    for addr in addrs:
        if _is_disallowed_address(addr):
            logger.warning(
                "ssrf_block: %s resolved to disallowed address %s", hostname, addr
            )
            raise ValueError(
                f"hostname {hostname} resolves to a disallowed address ({addr})"
            )


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

    # SSRF defense: refuse to fetch URLs that resolve to internal IPs.
    try:
        assert_safe_host(hostname)
    except ValueError as exc:
        return ValidationResult(
            is_valid=False,
            final_url=cleaned,
            rejection_reason=f"unsafe_host:{exc}",
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

            # SSRF re-check after redirects — catches Location: headers
            # that point at metadata IPs even when the origin host was
            # public.
            try:
                assert_safe_host(final_hostname)
            except ValueError as exc:
                return ValidationResult(
                    is_valid=False,
                    final_url=final_url,
                    rejection_reason=f"unsafe_host_after_redirect:{exc}",
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
