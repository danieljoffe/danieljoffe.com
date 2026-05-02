"""Target matching for the suggestion flow (#553).

When the LLM suggests targets, we match against existing targets before
creating new ones. This avoids duplicates and lets users discover targets
other users have already created.

Matching strategy:
1. Normalize label (lowercase, trim, collapse whitespace)
2. Exact match on normalized_label
3. Fuzzy match via pg_trgm similarity (threshold 0.7)
4. Exclude targets the user already has

Threshold rationale: 0.7 keeps "sr fe eng" → "Senior Frontend Engineer"
matches working while preventing specialization collisions like
"Senior Backend Engineer" → "Senior Frontend Engineer" (~0.59 similarity
because they share "senior" + "engineer" + suffix).
"""

from __future__ import annotations

import logging
import re
from typing import Any, cast

from supabase import Client

from app.models.experience import OptimizedPayload
from app.models.llm import LLMResult
from app.models.targets import (
    JobTarget,
    MatchedSuggestion,
    MatchedSuggestions,
)
from app.services.llm.client import LLMClient
from app.services.targets.crud import (
    TARGETS_TABLE,
    _parse_target,
    get_user_target_ids,
)
from app.services.targets.suggest import suggest_targets

logger = logging.getLogger(__name__)

_WHITESPACE_RE = re.compile(r"\s+")
_SIMILARITY_THRESHOLD = 0.7


def _normalize_label(label: str) -> str:
    """Normalize a target label for matching."""
    return _WHITESPACE_RE.sub(" ", label.lower().strip())


def find_matching_target(
    supabase: Client, label: str
) -> JobTarget | None:
    """Find an existing target matching a label, or None.

    Tries exact match first, then fuzzy via pg_trgm similarity.
    """
    normalized = _normalize_label(label)

    # Exact match
    resp = (
        supabase.table(TARGETS_TABLE)
        .select("*")
        .eq("normalized_label", normalized)
        .limit(1)
        .execute()
    )
    rows = cast(list[dict[str, Any]], resp.data or [])
    if rows:
        return _parse_target(rows[0])

    # Fuzzy match via pg_trgm (requires the extension enabled in Phase 1)
    try:
        rpc_resp = supabase.rpc(
            "match_target_by_label",
            {"query_label": normalized, "threshold": _SIMILARITY_THRESHOLD},
        ).execute()
        rpc_rows = cast(list[dict[str, Any]], rpc_resp.data or [])
        if rpc_rows:
            return _parse_target(rpc_rows[0])
    except Exception:
        # RPC not yet created — fall back to exact-only matching
        logger.debug("match_target_by_label RPC not available, using exact match only")

    return None


async def suggest_and_match(
    supabase: Client,
    llm: LLMClient,
    *,
    payload: OptimizedPayload,
    user_id: str,
) -> tuple[MatchedSuggestions, LLMResult]:
    """Suggest targets, match against existing, exclude user's current targets.

    Returns (matched_suggestions, llm_result) so callers can log cost.
    """
    # Get user's existing target IDs to exclude
    existing_ids = get_user_target_ids(supabase, user_id)

    # Get LLM suggestions
    suggestions, result = await suggest_targets(llm, payload=payload)

    matches: list[MatchedSuggestion] = []
    for suggestion in suggestions.suggestions:
        # Try to match against existing targets
        matched = find_matching_target(supabase, suggestion.label)

        if matched and matched.id in existing_ids:
            # User already has this target — skip
            continue

        matches.append(
            MatchedSuggestion(
                suggestion=suggestion,
                matched_target=matched,
                is_new=matched is None,
            )
        )

    return MatchedSuggestions(matches=matches), result
