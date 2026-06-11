"""Cheap title-seniority pre-gate for Phase 2 (#902).

Phase 1's binary ``promising`` verdict is domain-oriented and deliberately
permissive ("lean-promising"), so it forwards many roles whose *seniority* is
well below the target's — a "Customer Success Manager" for a *Director*-level
target. Phase 2 (Sonnet) then spends a real grade discovering the obvious
mismatch. This module is a near-free string gate that drops clearly-below-level
titles *before* Phase 2, complementing — not replacing — the Phase 1 verdict.

Pure + dependency-free so it's trivially testable and safe to call in the hot
path. Conservative by design: it only rejects titles whose seniority is
*explicitly* below the bar, and passes anything ambiguous (no level token) so a
real role with an unusual title is never silently dropped.
"""

from __future__ import annotations

import re

from app.models.targets import SeniorityHint

# The canonical seniority ladder (mirrors models.targets.SeniorityHint).
_RANK: dict[str, int] = {
    "ic": 0,
    "senior": 1,
    "staff": 2,
    "manager": 3,
    "director": 4,
    "vp": 5,
    "c_level": 6,
}

# Title tokens → the rank they imply. Checked high-to-low; first match wins, so
# "Senior Director" reads as director, not senior. Word-boundaried to avoid
# matching inside other words (e.g. "management" must not trip "manager").
_TITLE_PATTERNS: tuple[tuple[int, re.Pattern[str]], ...] = (
    (6, re.compile(r"\b(chief|c[xeofmt]o|c-level|chief officer)\b", re.I)),
    (5, re.compile(r"\b(vp|svp|evp|vice[\s-]?president)\b", re.I)),
    (4, re.compile(r"\b(director|head\s+of|global\s+head|group\s+head)\b", re.I)),
    (3, re.compile(r"\b(manager|mgr)\b", re.I)),
    (1, re.compile(r"\b(senior|sr\.?|staff|principal|lead)\b", re.I)),
    (
        0,
        re.compile(
            r"\b(coordinator|specialist|associate|analyst|representative|"
            r"rep|agent|intern|assistant|clerk|trainee|apprentice)\b",
            re.I,
        ),
    ),
)


def detect_title_rank(title: str) -> int | None:
    """Best-guess seniority rank from a job title, or None if no level token.

    None means "no explicit seniority signal" — the gate treats that as a pass
    so unusual titles are never dropped on a guess.
    """
    for rank, pattern in _TITLE_PATTERNS:
        if pattern.search(title):
            return rank
    return None


def passes_seniority_gate(
    title: str,
    seniority_hint: SeniorityHint | None,
    *,
    tolerance: int = 1,
) -> bool:
    """True if ``title`` is senior enough to be worth a Phase 2 grade.

    Only gates targets whose hint is *director or above* — below that the bar is
    low enough that pre-filtering would mostly cause false drops, so it's a
    pass-through. ``tolerance`` allows roles up to N rungs below the hint (1 by
    default, so a *Manager* still grades for a *Director* target — the stretch
    case worth a look — but a *Coordinator* does not). Ambiguous titles (no
    level token) always pass.
    """
    if seniority_hint is None:
        return True
    hint_rank = _RANK[seniority_hint]
    if hint_rank < _RANK["director"]:
        return True
    title_rank = detect_title_rank(title)
    if title_rank is None:
        return True
    return title_rank >= hint_rank - tolerance


__all__ = ["detect_title_rank", "passes_seniority_gate"]
