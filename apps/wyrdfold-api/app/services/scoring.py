from __future__ import annotations

import re

from bs4 import BeautifulSoup

from app.models.schemas import ScoreBreakdown, ScoreResult
from app.models.targets import ScoringProfile
from app.services.jd_parser import ParsedJD, parse_jd

_WHITESPACE_RE = re.compile(r"\s+")


def strip_html(html: str) -> str:
    text = BeautifulSoup(html, "html.parser").get_text(separator=" ")
    return _WHITESPACE_RE.sub(" ", text).strip()


# ---- Smart keyword matching ------------------------------------------------

_WORD_BOUNDARY_CACHE: dict[str, re.Pattern[str]] = {}


def _keyword_in_text(keyword: str, text: str) -> bool:
    """Match a keyword against lowered text.

    Short alphabetic keywords (≤3 chars) use word-boundary regex to avoid
    false positives (e.g., "Go" matching "Google"). Non-alphabetic short
    keywords ("c#", "c++") and longer keywords use fast substring match.
    """
    kw_lower = keyword.lower()
    if len(kw_lower) <= 3 and kw_lower.isalpha():
        if kw_lower not in _WORD_BOUNDARY_CACHE:
            _WORD_BOUNDARY_CACHE[kw_lower] = re.compile(rf"\b{re.escape(kw_lower)}\b")
        return bool(_WORD_BOUNDARY_CACHE[kw_lower].search(text))
    return kw_lower in text


# Canonical keyword → common variations found in JDs.
_KEYWORD_ALIASES_RAW: dict[str, list[str]] = {
    # Frontend frameworks
    "react": ["reactjs", "react.js"],
    "next.js": ["nextjs", "next"],
    "nuxt.js": ["nuxtjs", "nuxt"],
    "vue.js": ["vuejs", "vue"],
    "angular": ["angularjs", "angular.js"],
    "svelte": ["sveltekit"],
    "remix": ["remix.run"],
    # Languages
    "typescript": ["ts"],
    "javascript": ["js", "ecmascript"],
    "python": ["py"],
    "golang": ["go"],
    "ruby": ["rb"],
    "c++": ["cpp"],
    "c#": ["csharp", "c sharp", "dotnet", ".net"],
    # Backend / runtime
    "node.js": ["nodejs", "node"],
    "express": ["expressjs", "express.js"],
    "fastapi": ["fast api"],
    "django": ["djangorestframework", "drf"],
    "ruby on rails": ["rails", "ror"],
    # Databases
    "postgresql": ["postgres", "psql"],
    "mongodb": ["mongo"],
    "mysql": ["mariadb"],
    "redis": ["valkey"],
    "elasticsearch": ["opensearch", "elastic"],
    # DevOps / cloud
    "kubernetes": ["k8s"],
    "docker": ["containerization", "containers"],
    "terraform": ["opentofu", "iac"],
    "ci/cd": ["ci cd", "cicd", "continuous integration", "continuous delivery"],
    "amazon web services": ["aws"],
    "google cloud platform": ["gcp", "google cloud"],
    "microsoft azure": ["azure"],
    # APIs / data
    "graphql": ["gql"],
    "rest": ["restful", "rest api"],
    # Testing
    "playwright": ["pw"],
    "cypress": ["cy"],
    "jest": ["vitest"],
    # Build tools
    "webpack": ["wp"],
    "tailwind css": ["tailwindcss", "tailwind"],
    # Concepts
    "machine learning": ["ml"],
    "artificial intelligence": ["ai"],
    "design system": ["design systems", "component library"],
    "accessibility": ["a11y", "wcag", "aria"],
    "server-side rendering": ["ssr"],
    "static site generation": ["ssg"],
    "internationalization": ["i18n"],
    "observability": ["o11y"],
}

# Version-stripping regex: "React 18" → "react", "Python 3.11" → "python"
_VERSION_RE = re.compile(r"\s+\d[\d.]*$")


def _strip_version(keyword: str) -> str:
    """Remove trailing version numbers from a keyword."""
    return _VERSION_RE.sub("", keyword)


# Build bidirectional alias lookup: alias → canonical, canonical → [aliases]
_KEYWORD_ALIASES: dict[str, list[str]] = {}
_ALIAS_TO_CANONICAL: dict[str, str] = {}

for _canonical, _aliases in _KEYWORD_ALIASES_RAW.items():
    _key = _canonical.lower()
    _KEYWORD_ALIASES[_key] = [a.lower() for a in _aliases]
    for _alias in _aliases:
        _ALIAS_TO_CANONICAL[_alias.lower()] = _key


def _keyword_or_alias_in_text(keyword: str, text: str) -> bool:
    """Check if a keyword or any of its aliases match in the text.

    Supports bidirectional lookup: if the keyword IS an alias, resolves
    to its canonical form first. Also strips version numbers.
    """
    kw_lower = _strip_version(keyword).lower()

    if _keyword_in_text(kw_lower, text):
        return True

    # Direct aliases (canonical → variants)
    aliases = _KEYWORD_ALIASES.get(kw_lower, [])
    if any(_keyword_in_text(alias, text) for alias in aliases):
        return True

    # Reverse lookup (alias → canonical → other aliases)
    canonical = _ALIAS_TO_CANONICAL.get(kw_lower)
    if canonical:
        if _keyword_in_text(canonical, text):
            return True
        for alias in _KEYWORD_ALIASES.get(canonical, []):
            if alias != kw_lower and _keyword_in_text(alias, text):
                return True

    return False


def _count_keyword_occurrences(keyword: str, text_lower: str) -> int:
    """Count how many times a keyword (or alias) appears in pre-lowered text.

    Returns capped at 3 — diminishing returns beyond repeated mentions.
    Caller must pass already-lowered text for performance.
    """
    kw_lower = _strip_version(keyword).lower()
    count = text_lower.count(kw_lower)
    if count == 0:
        for alias in _KEYWORD_ALIASES.get(kw_lower, []):
            count += text_lower.count(alias)
        # Also check reverse lookup
        if count == 0:
            canonical = _ALIAS_TO_CANONICAL.get(kw_lower)
            if canonical:
                count += text_lower.count(canonical)
    return min(3, count)


# ---- Target-based scoring (#495) -------------------------------------------

# Map dynamic category names to existing ScoreBreakdown fields.
# Pragmatic for v1: avoids migrating jobs.score_breakdown.
_CATEGORY_TO_FIELD: dict[str, str] = {
    "core_skills": "technologies",
    "secondary_skills": "domain_skills",
    "nice_to_have": "seniority_signals",
}

_SENIORITY_SIGNAL_WEIGHT = 2.0
_TITLE_WEIGHT = 2.0
_DEFAULT_NORMALIZER = 30.0
# Per-target ``search_keywords`` are the user's role-title intent (e.g.
# "director of customer experience"). They were previously only used by
# the poller to fetch jobs from boards — never scored. A title that hits
# any of them is the single strongest signal of "this is the right kind
# of role", so we credit it once at a high weight, applied via the same
# ``_TITLE_WEIGHT`` boost the category keywords use when matched in title.
_ROLE_TITLE_WEIGHT = 15.0


def _score_role_titles(
    search_keywords: list[str] | None, title_lower: str
) -> tuple[float, list[str]]:
    """Score the target's role-intent keywords against the job title.

    Returns ``(points, matched_keywords)``. Credit is binary: any number
    of matches earns a single fixed credit. Stacking matches (e.g. a
    title that hits three near-synonym variants) does not multiply the
    score — the user's intent is captured by *any* match.
    """
    if not search_keywords:
        return 0.0, []
    matched = [
        kw for kw in search_keywords if _keyword_or_alias_in_text(kw, title_lower)
    ]
    if not matched:
        return 0.0, []
    return _ROLE_TITLE_WEIGHT * _TITLE_WEIGHT, matched


def _calc_max_possible(
    profile: ScoringProfile, search_keywords: list[str] | None = None
) -> float:
    """Calculate the maximum possible raw score for a profile.

    Used as the normalizer so scores represent a true percentage of how
    well a job matches the target profile.
    """
    total = 0.0
    for cat_profile in profile.categories.values():
        for kw_weight in cat_profile.keywords.values():
            total += kw_weight * cat_profile.weight
    total += len(profile.seniority.signals) * _SENIORITY_SIGNAL_WEIGHT
    total += len(profile.domain.signals) * profile.domain.weight
    if search_keywords:
        total += _ROLE_TITLE_WEIGHT * _TITLE_WEIGHT
    return total


def score_job_with_profile(
    title: str,
    description_html: str,
    profile: ScoringProfile,
    *,
    parsed_jd: ParsedJD | None = None,
    search_keywords: list[str] | None = None,
) -> ScoreResult:
    """Score a job posting against a target's ScoringProfile (stage 2).

    Section-aware scoring: parses the JD into sections (requirements,
    nice-to-have, about, benefits) and weights keyword matches by section.
    Keywords in Requirements (2x) matter more than About Us (0.5x).

    Frequency weighting: repeated keyword mentions (up to 3x) contribute
    more than a single mention, weighted by section importance.

    Negatives only count in requirements sections and the title — a
    negative keyword in "About Us" or "Benefits" is not a disqualifier.

    Title gets a 2x boost applied as a high-weight section.

    Pass ``parsed_jd`` to skip HTML parsing when the same JD is scored
    against multiple targets.
    """
    parsed = parsed_jd if parsed_jd is not None else parse_jd(description_html)

    breakdown = ScoreBreakdown()
    all_matched: list[str] = []
    excluded = False

    # Title as a high-weight implicit section
    title_lower = title.lower()

    # ---- Category keywords across sections ----
    for cat_name, cat_profile in profile.categories.items():
        field_name = _CATEGORY_TO_FIELD.get(cat_name, "technologies")
        for keyword, kw_weight in cat_profile.keywords.items():
            keyword_points = 0.0
            matched = False

            # Title match (high-weight)
            if _keyword_or_alias_in_text(keyword, title_lower):
                keyword_points += kw_weight * cat_profile.weight * _TITLE_WEIGHT
                matched = True

            # Section matches (frequency x section weight)
            for section in parsed.sections:
                occurrences = _count_keyword_occurrences(keyword, section.text_lower)
                if occurrences > 0:
                    keyword_points += kw_weight * cat_profile.weight * section.weight * occurrences
                    matched = True

            if matched:
                current = getattr(breakdown, field_name)
                setattr(breakdown, field_name, current + keyword_points)
                all_matched.append(keyword)

    # ---- Seniority signals ----
    for signal in profile.seniority.signals:
        signal_points = 0.0
        matched = False

        if _keyword_or_alias_in_text(signal, title_lower):
            signal_points += _SENIORITY_SIGNAL_WEIGHT * _TITLE_WEIGHT
            matched = True

        for section in parsed.sections:
            if _keyword_or_alias_in_text(signal, section.text_lower):
                signal_points += _SENIORITY_SIGNAL_WEIGHT * section.weight
                matched = True

        if matched:
            breakdown.seniority_signals += signal_points
            all_matched.append(signal)

    # ---- Domain signals ----
    for signal in profile.domain.signals:
        signal_points = 0.0
        matched = False

        if _keyword_or_alias_in_text(signal, title_lower):
            signal_points += profile.domain.weight * _TITLE_WEIGHT
            matched = True

        for section in parsed.sections:
            if _keyword_or_alias_in_text(signal, section.text_lower):
                signal_points += profile.domain.weight * section.weight
                matched = True

        if matched:
            breakdown.domain_skills += signal_points
            all_matched.append(signal)

    # ---- Role-title intent (search_keywords) ----
    role_title_points, role_title_matches = _score_role_titles(
        search_keywords, title_lower
    )
    if role_title_matches:
        breakdown.role_titles += role_title_points
        all_matched.extend(role_title_matches)

    # ---- Negative keywords (only in title + requirements sections) ----
    negative_sections = {"requirements", "default"}
    for keyword in profile.negative.keywords:
        # Check title
        if _keyword_or_alias_in_text(keyword, title_lower):
            breakdown.negative += profile.negative.weight
            excluded = True
            continue

        # Check requirements-type sections only
        for section in parsed.sections:
            if section.name in negative_sections and _keyword_or_alias_in_text(
                keyword, section.text_lower
            ):
                breakdown.negative += profile.negative.weight
                excluded = True
                break

    # Dynamic normalization
    raw = (
        breakdown.role_titles
        + breakdown.technologies
        + breakdown.domain_skills
        + breakdown.seniority_signals
        + breakdown.negative
    )

    max_possible = _calc_max_possible(profile, search_keywords)
    normalizer = max(max_possible, 1.0)
    score = max(0, min(100, round((raw / normalizer) * 100)))
    if excluded:
        score = 0

    return ScoreResult(
        score=score,
        breakdown=breakdown,
        matched_keywords=list(set(all_matched)),
        excluded=excluded,
    )


# ---- Stage 1: Title-only scoring ------------------------------------------


def _calc_title_max_possible(
    profile: ScoringProfile, search_keywords: list[str] | None = None
) -> float:
    """Max possible raw score from title matching alone."""
    total = 0.0
    for cat_profile in profile.categories.values():
        for kw_weight in cat_profile.keywords.values():
            total += kw_weight * cat_profile.weight
    total += len(profile.seniority.signals) * _SENIORITY_SIGNAL_WEIGHT
    if search_keywords:
        total += _ROLE_TITLE_WEIGHT * _TITLE_WEIGHT
    return total


def score_title_against_profile(
    title: str,
    profile: ScoringProfile,
    *,
    search_keywords: list[str] | None = None,
) -> ScoreResult:
    """Fast title-only scoring against a target's ScoringProfile.

    Stage 1 of the three-stage pipeline. Checks if any of the target's
    keywords or seniority signals appear in the job title. Produces a
    preliminary score normalized against the profile's max possible.

    Negative keywords are also checked in the title — a hard-exclude
    match in the title is a strong signal to skip.
    """
    title_lower = title.lower()

    breakdown = ScoreBreakdown()
    all_matched: list[str] = []
    excluded = False

    # Category keywords
    for cat_name, cat_profile in profile.categories.items():
        field_name = _CATEGORY_TO_FIELD.get(cat_name, "technologies")
        for keyword, kw_weight in cat_profile.keywords.items():
            if _keyword_or_alias_in_text(keyword, title_lower):
                points = kw_weight * cat_profile.weight
                current = getattr(breakdown, field_name)
                setattr(breakdown, field_name, current + points)
                all_matched.append(keyword)

    # Seniority signals
    for signal in profile.seniority.signals:
        if _keyword_or_alias_in_text(signal, title_lower):
            breakdown.seniority_signals += _SENIORITY_SIGNAL_WEIGHT
            all_matched.append(signal)

    # Role-title intent (search_keywords)
    role_title_points, role_title_matches = _score_role_titles(
        search_keywords, title_lower
    )
    if role_title_matches:
        breakdown.role_titles += role_title_points
        all_matched.extend(role_title_matches)

    # Negative keywords
    for keyword in profile.negative.keywords:
        if _keyword_or_alias_in_text(keyword, title_lower):
            breakdown.negative += profile.negative.weight
            excluded = True

    raw = (
        breakdown.role_titles
        + breakdown.technologies
        + breakdown.domain_skills
        + breakdown.seniority_signals
        + breakdown.negative
    )

    max_possible = _calc_title_max_possible(profile, search_keywords)
    normalizer = max(max_possible, 1.0)
    score = max(0, min(100, round((raw / normalizer) * 100)))
    if excluded:
        score = 0

    return ScoreResult(
        score=score,
        breakdown=breakdown,
        matched_keywords=list(set(all_matched)),
        excluded=excluded,
    )
