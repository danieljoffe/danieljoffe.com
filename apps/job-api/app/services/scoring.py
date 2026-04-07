import re

from bs4 import BeautifulSoup

from app.models.schemas import ScoreBreakdown, ScoreResult
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
    hard_count, hard_matched = _count_matches(searchable, config.negative_keywords.hard_exclude)
    soft_count, soft_matched = _count_matches(searchable, config.negative_keywords.soft_exclude)
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
