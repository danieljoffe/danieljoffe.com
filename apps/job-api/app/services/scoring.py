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
        if kw.lower() in text:
            matched.append(kw)
    return len(matched), matched


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


def score_job_with_profile(
    title: str,
    description_html: str,
    profile: ScoringProfile,
) -> ScoreResult:
    """Score a job posting against a target's ScoringProfile.

    Unlike score_job() which uses tiered keyword lists with global weights,
    this function uses per-keyword weights and per-category multipliers.
    """
    description_text = strip_html(description_html)
    # Weight title matches by prepending title twice (same as score_job)
    searchable = f"{title} {title} {description_text}".lower()

    breakdown = ScoreBreakdown()
    all_matched: list[str] = []
    excluded = False

    # Dynamic categories
    for cat_name, cat_profile in profile.categories.items():
        field_name = _CATEGORY_TO_FIELD.get(cat_name, "technologies")
        for keyword, kw_weight in cat_profile.keywords.items():
            if keyword.lower() in searchable:
                points = kw_weight * cat_profile.weight
                current = getattr(breakdown, field_name)
                setattr(breakdown, field_name, current + points)
                all_matched.append(keyword)

    # Seniority signals
    for signal in profile.seniority.signals:
        if signal.lower() in searchable:
            breakdown.seniority_signals += _SENIORITY_SIGNAL_WEIGHT
            all_matched.append(signal)

    # Domain signals
    for signal in profile.domain.signals:
        if signal.lower() in searchable:
            breakdown.domain_skills += profile.domain.weight
            all_matched.append(signal)

    # Negative keywords
    for keyword in profile.negative.keywords:
        if keyword.lower() in searchable:
            breakdown.negative += profile.negative.weight
            excluded = True

    # Same normalization as score_job
    raw = (
        breakdown.role_titles
        + breakdown.technologies
        + breakdown.domain_skills
        + breakdown.seniority_signals
        + breakdown.negative
    )

    score = max(0, min(100, round((raw / _DEFAULT_NORMALIZER) * 100)))
    if excluded:
        score = 0

    return ScoreResult(
        score=score,
        breakdown=breakdown,
        matched_keywords=list(set(all_matched)),
        excluded=excluded,
    )
