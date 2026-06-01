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

    Alphabetic single-word keywords ALWAYS use word-boundary regex so
    "lead" does not match "leadership", "rep" does not match "repository",
    "go" does not match "google". The prior 3-char gate let everything
    longer than 3 chars fall through to substring match, which silently
    produced director-vs-rep false positives in the wild.

    Non-alphabetic ("c#", "c++") and multi-word ("director of cx") keywords
    fall back to substring match since regex word-boundaries don't reliably
    handle non-alpha tokens and ATS authors rarely mirror our exact spacing.
    """
    kw_lower = keyword.lower()
    if kw_lower.isalpha():
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

# Senior-tier seniority levels. When ``profile.seniority.level`` is one of
# these, common junior-IC title tokens get auto-prepended to the negative
# keyword list, so a Director target never scores a Rep / Associate /
# Coordinator title above zero regardless of how many JD-side keywords
# happen to incidentally match.
_SENIOR_LEVELS: frozenset[str] = frozenset(
    {
        "director",
        "vp",
        "vice president",
        "head",
        "head of",
        "principal",
        "staff",
        "executive",
        "chief",
    }
)

# Junior-IC title tokens that are noise for senior targets. Single-word,
# alpha-only so the word-boundary matcher catches them cleanly without
# accidentally hitting phrases like "agentic" (-> "agent").
_JUNIOR_TITLE_TOKENS: tuple[str, ...] = (
    "junior",
    "jr",
    "intern",
    "internship",
    "trainee",
    "apprentice",
    "associate",
    "rep",
    "representative",
    "coordinator",
    "specialist",
    "assistant",
    "agent",
)

# Coarse seniority tier ladder. Higher number = more senior. A title
# ranked >1 tier below the profile's level earns a heavy penalty
# (``_TIER_PENALTY_PER_DELTA`` per tier of gap beyond the first).
# Word-boundary matching means "senior" doesn't hit "seniors" and
# "director" doesn't hit "directorate".
_TITLE_TIERS: dict[int, tuple[str, ...]] = {
    0: ("intern", "internship", "trainee", "apprentice"),
    1: (
        "junior",
        "jr",
        "associate",
        "rep",
        "representative",
        "coordinator",
        "specialist",
        "assistant",
        "agent",
    ),
    2: ("analyst",),
    3: ("engineer", "designer", "manager", "developer"),
    4: ("senior", "sr", "lead"),
    5: ("staff", "principal"),
    6: ("director",),
    7: ("head", "vp"),
    8: ("chief", "executive"),
}

_LEVEL_TO_TIER: dict[str, int] = {
    level.lower(): tier
    for tier, levels in _TITLE_TIERS.items()
    for level in levels
}
# Multi-word level aliases the LLM emits for ``profile.seniority.level``.
_LEVEL_TO_TIER["vice president"] = 7
_LEVEL_TO_TIER["head of"] = 7

_TIER_PENALTY_PER_DELTA = -10.0


def _is_senior_target(profile: ScoringProfile) -> bool:
    """True if this profile targets a senior-tier role (director+)."""
    level = (profile.seniority.level or "").strip().lower()
    return bool(level) and level in _SENIOR_LEVELS


def _effective_negative_keywords(profile: ScoringProfile) -> list[str]:
    """Return user-set negatives plus auto-junior tokens for senior targets.

    Junior tokens get folded in deterministically rather than asked from
    the LLM during profile derivation — the LLM was inconsistent about
    listing them (only emitted "junior" / "intern" / "entry-level"),
    which meant "Customer Service Representative" titles still slipped
    through to a Director target.
    """
    base = list(profile.negative.keywords)
    if _is_senior_target(profile):
        existing = {kw.lower() for kw in base}
        for kw in _JUNIOR_TITLE_TOKENS:
            if kw not in existing:
                base.append(kw)
    return base


def _highest_title_tier(title_lower: str) -> int | None:
    """Return the highest seniority tier any token in the title matches."""
    for tier in sorted(_TITLE_TIERS.keys(), reverse=True):
        for token in _TITLE_TIERS[tier]:
            if _keyword_in_text(token, title_lower):
                return tier
    return None


def _seniority_tier_penalty(
    title_lower: str, profile_level: str | None
) -> float:
    """Penalty when the title sits more than one tier below the profile.

    Same tier or one below = no penalty (e.g. a Manager title for a
    Director target is a soft mismatch, not noise). Two or more tiers
    below scales linearly: Manager-for-Director = 0, Engineer-for-Director
    = -10, Rep-for-Director = -40.

    Returns 0.0 when the profile has no level set or no seniority signal
    appears in the title at all — we can't penalize what we can't classify.
    """
    if not profile_level:
        return 0.0
    target_tier = _LEVEL_TO_TIER.get(profile_level.strip().lower())
    if target_tier is None:
        return 0.0
    title_tier = _highest_title_tier(title_lower)
    if title_tier is None:
        return 0.0
    delta = title_tier - target_tier
    if delta >= -1:
        return 0.0
    return _TIER_PENALTY_PER_DELTA * abs(delta + 1)


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
    for keyword in _effective_negative_keywords(profile):
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

    # ---- Seniority-tier penalty ----
    # Pushes "Engineer" / "Rep" titles below the floor for a Director
    # target even when no explicit negative-keyword matches. Stacks
    # additively with the negative bucket since both are deductions.
    breakdown.negative += _seniority_tier_penalty(
        title_lower, profile.seniority.level
    )

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

    # Negative keywords (user-set + auto-junior for senior targets)
    for keyword in _effective_negative_keywords(profile):
        if _keyword_or_alias_in_text(keyword, title_lower):
            breakdown.negative += profile.negative.weight
            excluded = True

    # Seniority-tier penalty — see _seniority_tier_penalty docstring
    breakdown.negative += _seniority_tier_penalty(
        title_lower, profile.seniority.level
    )

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
