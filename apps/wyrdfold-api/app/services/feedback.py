"""Per-(user, target) feedback CRUD + deterministic learner (v1).

v1 learner is intentionally LLM-free: when N>=3 unapplied
``irrelevant`` signals share a literal token in their ``reason`` field,
that token gets appended to the target's
``scoring_profile.negative.keywords`` and the consumed rows get stamped
with ``applied_at``. v2 will layer an LLM ``ProfilePatch`` on top of
this same plumbing.

Why deterministic first: an LLM patch is expensive and only useful once
we have labeled data to validate against. The literal-token path moves
the needle for noisy targets at zero LLM cost and produces a clean
audit trail before v2 ships.
"""

from __future__ import annotations

import logging
import re
import uuid
from collections import Counter
from datetime import UTC, datetime
from typing import Any, cast

from supabase import Client

from app.models.feedback import (
    FeedbackRow,
    FeedbackSignal,
    LearnerPatchSummary,
)

logger = logging.getLogger(__name__)

TABLE = "job_feedback"

# Minimum unapplied "irrelevant" signals before the learner does anything.
# Picked to balance signal vs noise: 1-2 clicks could be a misclick, 3+
# is a pattern. Tuned alongside ``_MIN_TOKEN_FREQUENCY`` below.
_MIN_FEEDBACK_FOR_LEARN = 3

# A token must appear in >= this many distinct unapplied irrelevant rows
# to be auto-added as a negative keyword. Same number as the trip
# threshold above so a single 3-click batch with one shared token
# applies — but a single click with a long shared phrase doesn't.
_MIN_TOKEN_FREQUENCY = 3

# Words we don't want to learn as negatives even if they show up
# repeatedly — they're either generic or already structural.
_LEARN_STOPWORDS: frozenset[str] = frozenset(
    {
        "a", "an", "and", "the", "or", "but", "if", "of", "to", "for",
        "in", "on", "at", "by", "with", "as", "is", "are", "was", "were",
        "be", "been", "being", "this", "that", "these", "those", "it",
        "its", "i", "me", "my", "we", "us", "our", "you", "your", "he",
        "she", "they", "them", "not", "no", "too", "very", "so", "than",
        "then", "just", "really",
        # Domain-generic words that would zero-out half the corpus if learned.
        "job", "role", "position", "company", "team", "work", "opportunity",
    }
)

_TOKEN_RE = re.compile(r"[a-zA-Z][a-zA-Z\-]{2,}")


def _parse_row(row: dict[str, Any]) -> FeedbackRow:
    return FeedbackRow.model_validate(row)


def upsert_feedback(
    supabase: Client,
    *,
    user_id: str,
    job_posting_id: str,
    target_id: str,
    signal: FeedbackSignal,
    reason: str | None,
) -> FeedbackRow:
    """Upsert a feedback row. Latest signal wins on the unique key."""
    payload: dict[str, Any] = {
        "user_id": user_id,
        "job_posting_id": job_posting_id,
        "target_id": target_id,
        "signal": signal,
        "reason": reason,
        # An update on (user, job, target) must reset the applied state —
        # otherwise an irrelevant→relevant flip would silently leave the
        # old "consumed" stamp on the row and the new signal would never
        # be processed.
        "applied_at": None,
        "applied_run_id": None,
        "updated_at": datetime.now(UTC).isoformat(),
    }
    resp = (
        supabase.table(TABLE)
        .upsert(payload, on_conflict="user_id,job_posting_id,target_id")
        .execute()
    )
    rows = cast(list[dict[str, Any]], resp.data or [])
    if not rows:
        raise RuntimeError("Failed to upsert job_feedback row")
    return _parse_row(rows[0])


def delete_feedback(
    supabase: Client, *, user_id: str, job_posting_id: str, target_id: str
) -> bool:
    """Remove a feedback row. Returns True if a row was deleted."""
    resp = (
        supabase.table(TABLE)
        .delete()
        .eq("user_id", user_id)
        .eq("job_posting_id", job_posting_id)
        .eq("target_id", target_id)
        .execute()
    )
    rows = cast(list[dict[str, Any]], resp.data or [])
    return bool(rows)


def list_for_target(
    supabase: Client,
    *,
    user_id: str,
    target_id: str,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[FeedbackRow], int]:
    """Return the user's feedback rows for one target, newest first."""
    from postgrest import CountMethod

    resp = (
        supabase.table(TABLE)
        .select("*", count=CountMethod.exact)
        .eq("user_id", user_id)
        .eq("target_id", target_id)
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    rows = cast(list[dict[str, Any]], resp.data or [])
    total = getattr(resp, "count", None) or len(rows)
    return [_parse_row(r) for r in rows], total


# ---- Deterministic learner ------------------------------------------------


def _extract_tokens(reason: str | None) -> list[str]:
    """Lowercase content tokens from a feedback reason, stopwords removed."""
    if not reason:
        return []
    return [
        m.group(0).lower()
        for m in _TOKEN_RE.finditer(reason)
        if m.group(0).lower() not in _LEARN_STOPWORDS
    ]


def _frequent_tokens(
    rows: list[FeedbackRow], threshold: int
) -> list[str]:
    """Tokens that appear in ``>= threshold`` distinct rows. Order: most
    frequent first, ties broken by first-seen order so the result is
    stable across runs."""
    seen_in: Counter[str] = Counter()
    for row in rows:
        for token in set(_extract_tokens(row.reason)):
            seen_in[token] += 1
    return [tok for tok, n in seen_in.most_common() if n >= threshold]


def maybe_run_learner(
    supabase: Client, *, user_id: str, target_id: str
) -> LearnerPatchSummary | None:
    """Run the deterministic learner for one (user, target) pair.

    Returns a summary when something was applied, None when the trip
    threshold wasn't reached (so the caller can keep the API response
    cheap and skip the diff render).
    """
    pending_resp = (
        supabase.table(TABLE)
        .select("*")
        .eq("user_id", user_id)
        .eq("target_id", target_id)
        .eq("signal", "irrelevant")
        .is_("applied_at", "null")
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    pending = [
        _parse_row(r) for r in cast(list[dict[str, Any]], pending_resp.data or [])
    ]
    if len(pending) < _MIN_FEEDBACK_FOR_LEARN:
        return None

    new_tokens = _frequent_tokens(pending, _MIN_TOKEN_FREQUENCY)
    if not new_tokens:
        # 3+ signals but no token appears in 3+ rows — nothing literal to
        # learn from. v2's LLM step is what handles this case.
        return None

    target_resp = (
        supabase.table("targets")
        .select("*")
        .eq("id", target_id)
        .single()
        .execute()
    )
    target_row = cast(dict[str, Any] | None, target_resp.data)
    if target_row is None:
        return None
    profile = cast(dict[str, Any], target_row.get("scoring_profile") or {})
    negative = cast(dict[str, Any], profile.get("negative") or {})
    existing = {
        kw.lower()
        for kw in cast(list[str], negative.get("keywords") or [])
    }
    truly_new = [t for t in new_tokens if t not in existing]
    if not truly_new:
        # All frequent tokens are already in the negative list — nothing
        # to do. Don't bump version, don't stamp rows.
        return None

    negative["keywords"] = cast(
        list[str], negative.get("keywords") or []
    ) + truly_new
    if "weight" not in negative:
        # Mirror the default the LLM derivation emits so the merged profile
        # remains a valid ``NegativeProfile``.
        negative["weight"] = -10.0
    profile["negative"] = negative

    next_version = int(target_row.get("profile_version") or 1) + 1
    supabase.table("targets").update(
        {
            "scoring_profile": profile,
            "profile_version": next_version,
            "updated_at": datetime.now(UTC).isoformat(),
        }
    ).eq("id", target_id).execute()

    run_id = str(uuid.uuid4())
    consumed_ids = [r.id for r in pending]
    supabase.table(TABLE).update(
        {
            "applied_at": datetime.now(UTC).isoformat(),
            "applied_run_id": run_id,
        }
    ).in_("id", consumed_ids).execute()

    logger.info(
        "Feedback learner applied for (user=%s, target=%s): +%d negative "
        "keyword(s) %s, %d signals consumed, profile_version=%d",
        user_id,
        target_id,
        len(truly_new),
        truly_new,
        len(consumed_ids),
        next_version,
    )

    return LearnerPatchSummary(
        target_id=target_id,
        applied_run_id=run_id,
        added_negative_keywords=truly_new,
        signals_consumed=len(consumed_ids),
        profile_version_after=next_version,
    )
