import re

from bs4 import BeautifulSoup

from app.models.schemas import ScoreBreakdown, ScoreResult
from app.models.targets import ScoringProfile
from app.seed.keyword_config import SCORE_WEIGHTS, KeywordConfig

_HTML_TAG_RE = re.compile(r"<[^>]+>")
_WHITESPACE_RE = re.compile(r"\s+")


def strip_html(html: str) -> str:
    text = BeautifulSoup(html, "html.parser").get_text(separator=" ")
    return _WHITESPACE_RE.sub(" ", text).strip()


def _count_matches(text: str, keywords: list[str]) -> tuple[float, list[str]]:
    matched: list[str] = []
    for kw in keywords:
        if _keyword_in_text(kw, text):
            matched.append(kw)
    return len(matched), matched


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
_KEYWORD_ALIASES: dict[str, list[str]] = {
    "react": ["reactjs", "react.js"],
    "node.js": ["nodejs", "node"],
    "next.js": ["nextjs", "next"],
    "nuxt.js": ["nuxtjs", "nuxt"],
    "vue.js": ["vuejs", "vue"],
    "angular": ["angularjs", "angular.js"],
    "typescript": ["ts"],
    "javascript": ["js"],
    "postgresql": ["postgres", "psql"],
    "mongodb": ["mongo"],
    "graphql": ["gql"],
    "kubernetes": ["k8s"],
    "ci/cd": ["ci cd", "cicd"],
    "c++": ["cpp"],
    "c#": ["csharp", "c sharp"],
    "ruby on rails": ["rails", "ror"],
    "amazon web services": ["aws"],
    "google cloud platform": ["gcp"],
    "machine learning": ["ml"],
    "artificial intelligence": ["ai"],
}


def _keyword_or_alias_in_text(keyword: str, text: str) -> bool:
    """Check if a keyword or any of its aliases match in the text."""
    if _keyword_in_text(keyword, text):
        return True
    aliases = _KEYWORD_ALIASES.get(keyword.lower(), [])
    return any(_keyword_in_text(alias, text) for alias in aliases)


def score_job(title: str, description_html: str, config: KeywordConfig) -> ScoreResult:
    description_text = strip_html(description_html)
    # Weight title matches by prepending title twice
    searchable = f"{title} {title} {description_text}".lower()

    breakdown = ScoreBreakdown()
    all_matched: list[str] = []
    excluded = False

    # Role titles
    for tier in ("high", "medium", "low"):
        keywords = getattr(config.role_titles, tier, [])
        count, matched = _count_matches(searchable, keywords)
        points = count * SCORE_WEIGHTS[tier]
        breakdown.role_titles += points
        all_matched.extend(matched)

    # Technologies
    for tier in ("high", "medium", "low"):
        keywords = getattr(config.technologies, tier, [])
        count, matched = _count_matches(searchable, keywords)
        points = count * SCORE_WEIGHTS[tier]
        breakdown.technologies += points
        all_matched.extend(matched)

    # Domain skills
    for tier in ("high", "medium"):
        keywords = getattr(config.domain_skills, tier, [])
        count, matched = _count_matches(searchable, keywords)
        points = count * SCORE_WEIGHTS[tier]
        breakdown.domain_skills += points
        all_matched.extend(matched)

    # Seniority signals
    for tier in ("high", "medium"):
        keywords = getattr(config.seniority_signals, tier, [])
        count, matched = _count_matches(searchable, keywords)
        points = count * SCORE_WEIGHTS[tier]
        breakdown.seniority_signals += points
        all_matched.extend(matched)

    # Negative keywords
    hard_count, _hard_matched = _count_matches(searchable, config.negative_keywords.hard_exclude)
    soft_count, _soft_matched = _count_matches(searchable, config.negative_keywords.soft_exclude)
    breakdown.negative = (hard_count * SCORE_WEIGHTS["hard_exclude"]) + (
        soft_count * SCORE_WEIGHTS["soft_exclude"]
    )

    if hard_count > 0:
        excluded = True

    # Calculate raw score
    raw = (
        breakdown.role_titles
        + breakdown.technologies
        + breakdown.domain_skills
        + breakdown.seniority_signals
        + breakdown.negative
    )

    # Normalize to 0-100
    normalizer = SCORE_WEIGHTS.get("normalizer", 30)
    score = max(0, min(100, round((raw / normalizer) * 100)))

    if excluded:
        score = 0

    return ScoreResult(
        score=score,
        breakdown=breakdown,
        matched_keywords=list(set(all_matched)),
        excluded=excluded,
    )


# ---- Target-based scoring (#495) -------------------------------------------

# Map dynamic category names to existing ScoreBreakdown fields.
# Pragmatic for v1: avoids migrating job_postings.score_breakdown.
_CATEGORY_TO_FIELD: dict[str, str] = {
    "core_skills": "technologies",
    "secondary_skills": "domain_skills",
    "nice_to_have": "seniority_signals",
}

_SENIORITY_SIGNAL_WEIGHT = 2.0
_DEFAULT_NORMALIZER = 30.0


def _calc_max_possible(profile: ScoringProfile) -> float:
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
    return total


def score_job_with_profile(
    title: str,
    description_html: str,
    profile: ScoringProfile,
) -> ScoreResult:
    """Score a job posting against a target's ScoringProfile.

    Unlike score_job() which uses tiered keyword lists with global weights,
    this function uses per-keyword weights and per-category multipliers.
    The normalizer is dynamic — based on the profile's max possible score —
    so scores represent a true percentage of match quality.
    """
    description_text = strip_html(description_html)
    # Weight title matches by prepending title twice (same as score_job)
    searchable = f"{title} {title} {description_text}".lower()

    breakdown = ScoreBreakdown()
    all_matched: list[str] = []
    excluded = False

    # Dynamic categories (with alias expansion)
    for cat_name, cat_profile in profile.categories.items():
        field_name = _CATEGORY_TO_FIELD.get(cat_name, "technologies")
        for keyword, kw_weight in cat_profile.keywords.items():
            if _keyword_or_alias_in_text(keyword, searchable):
                points = kw_weight * cat_profile.weight
                current = getattr(breakdown, field_name)
                setattr(breakdown, field_name, current + points)
                all_matched.append(keyword)

    # Seniority signals (with alias expansion)
    for signal in profile.seniority.signals:
        if _keyword_or_alias_in_text(signal, searchable):
            breakdown.seniority_signals += _SENIORITY_SIGNAL_WEIGHT
            all_matched.append(signal)

    # Domain signals (with alias expansion)
    for signal in profile.domain.signals:
        if _keyword_or_alias_in_text(signal, searchable):
            breakdown.domain_skills += profile.domain.weight
            all_matched.append(signal)

    # Negative keywords
    for keyword in profile.negative.keywords:
        if _keyword_or_alias_in_text(keyword, searchable):
            breakdown.negative += profile.negative.weight
            excluded = True

    # Dynamic normalization: score as percentage of max possible
    raw = (
        breakdown.role_titles
        + breakdown.technologies
        + breakdown.domain_skills
        + breakdown.seniority_signals
        + breakdown.negative
    )

    max_possible = _calc_max_possible(profile)
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
