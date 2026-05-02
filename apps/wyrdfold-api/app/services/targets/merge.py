"""Merge scoring profiles from multiple reference JDs.

When a target has multiple reference JDs, each with its own extracted profile,
this module merges them into a single composite profile.

Strategy (per fitted-scope.md):
- Categories: union keywords; overlapping keywords get averaged weights
  (rounded to nearest int, min 1). Category weight = average across profiles.
- Seniority: most common level (mode); union of signals.
- Domain: union signals; average weight.
- Negative: union keywords; keep the most negative weight.
"""

from collections import Counter

from app.models.targets import (
    CategoryProfile,
    DomainProfile,
    NegativeProfile,
    ScoringProfile,
    SeniorityProfile,
)


def merge_profiles(profiles: list[ScoringProfile]) -> ScoringProfile:
    """Merge N extracted profiles into one composite profile."""
    if not profiles:
        return ScoringProfile()
    if len(profiles) == 1:
        return profiles[0].model_copy(deep=True)

    return ScoringProfile(
        categories=_merge_categories(profiles),
        seniority=_merge_seniority(profiles),
        domain=_merge_domain(profiles),
        negative=_merge_negative(profiles),
    )


def _merge_categories(
    profiles: list[ScoringProfile],
) -> dict[str, CategoryProfile]:
    """Union all categories, averaging keyword weights and category weights."""
    # Collect keyword weights per category: {cat_name: {keyword: [weights]}}
    cat_keywords: dict[str, dict[str, list[int]]] = {}
    cat_weights: dict[str, list[float]] = {}

    for profile in profiles:
        for cat_name, cat in profile.categories.items():
            if cat_name not in cat_keywords:
                cat_keywords[cat_name] = {}
                cat_weights[cat_name] = []

            cat_weights[cat_name].append(cat.weight)

            for keyword, weight in cat.keywords.items():
                if keyword not in cat_keywords[cat_name]:
                    cat_keywords[cat_name][keyword] = []
                cat_keywords[cat_name][keyword].append(weight)

    merged: dict[str, CategoryProfile] = {}
    for cat_name in cat_keywords:
        keywords = {
            kw: max(1, round(sum(ws) / len(ws)))
            for kw, ws in cat_keywords[cat_name].items()
        }
        cat_w = sum(cat_weights[cat_name]) / len(cat_weights[cat_name])
        merged[cat_name] = CategoryProfile(keywords=keywords, weight=round(cat_w, 2))

    return merged


def _merge_seniority(profiles: list[ScoringProfile]) -> SeniorityProfile:
    """Mode of levels, union of signals."""
    levels = [p.seniority.level for p in profiles if p.seniority.level]
    level = Counter(levels).most_common(1)[0][0] if levels else None

    signals: list[str] = []
    seen: set[str] = set()
    for p in profiles:
        for s in p.seniority.signals:
            key = s.lower()
            if key not in seen:
                seen.add(key)
                signals.append(s)

    return SeniorityProfile(level=level, signals=signals)


def _merge_domain(profiles: list[ScoringProfile]) -> DomainProfile:
    """Union signals, average weight."""
    signals: list[str] = []
    seen: set[str] = set()
    weights: list[float] = []

    for p in profiles:
        weights.append(p.domain.weight)
        for s in p.domain.signals:
            key = s.lower()
            if key not in seen:
                seen.add(key)
                signals.append(s)

    avg_weight = sum(weights) / len(weights) if weights else 0.5
    return DomainProfile(signals=signals, weight=round(avg_weight, 2))


def _merge_negative(profiles: list[ScoringProfile]) -> NegativeProfile:
    """Union keywords, keep the most negative weight."""
    keywords: list[str] = []
    seen: set[str] = set()
    min_weight = -10.0

    for p in profiles:
        min_weight = min(min_weight, p.negative.weight)
        for kw in p.negative.keywords:
            key = kw.lower()
            if key not in seen:
                seen.add(key)
                keywords.append(kw)

    return NegativeProfile(keywords=keywords, weight=min_weight)
