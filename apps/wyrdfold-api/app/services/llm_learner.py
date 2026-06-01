"""LLM-driven feedback learner (Doc 2 v2).

Layered on the v1 deterministic learner (``app.services.feedback``) — v1's
literal-token path handles the obvious case ("3 users marked 'sales rep'
irrelevant"); v2 takes the rest. The LLM reads job title + reason on
unapplied feedback rows alongside the current scoring profile and emits
a ``ProfilePatch`` (add/remove negatives, add secondaries, demote
keywords). High-confidence patches auto-apply; low-confidence stage in
``target_learning_log`` for user review.

Cost: one Sonnet call per learn-run per (user, target) — same model the
existing ``derive_profile_from_label`` pipeline uses. The system prompt
is cacheable so repeated runs on the same target only pay variable-tokens.
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import UTC, datetime
from typing import Any, cast

from supabase import Client

from app.models.feedback import FeedbackRow
from app.models.learning import (
    CONFIDENCE_AUTO_APPLY,
    LearningRunResult,
    LearningStatus,
    ProfilePatch,
    TargetLearningLogRow,
)
from app.models.llm import Message, ModelId
from app.services.feedback import _MIN_FEEDBACK_FOR_LEARN, _parse_row
from app.services.llm.client import LLMClient, complete_json
from app.services.llm.cost_log import enqueue as enqueue_llm_cost

logger = logging.getLogger(__name__)

DEFAULT_MODEL: ModelId = "claude-sonnet-4-6"
DEFAULT_PURPOSE = "target.learn_from_feedback"

LEARNING_LOG_TABLE = "target_learning_log"

SYSTEM_PROMPT = """\
You are a job-search relevance learner. Given a user's scoring profile \
for one of their target roles and a batch of relevance feedback signals \
they have left on individual job postings, return a minimal ``ProfilePatch`` \
that adjusts the profile to better match their preferences going forward.

Your goal is precision, not completeness. A single misclick is noise — \
only patch the profile when at least 2 distinct feedback rows agree on \
the same underlying pattern. Prefer surgical edits to the negative list \
over rewriting categories.

Rules:
- ``add_negative`` is for keywords that, when present in a JOB TITLE or \
  REQUIREMENTS section, should disqualify the posting. Prefer single \
  words over phrases (the matcher normalizes word boundaries). Example: \
  the user marks three Sales Rep postings irrelevant with reason "sales \
  role" — add "sales". Don't add the user's own role title here.
- ``remove_negative`` is for keywords you can show are over-rejecting — \
  this fires when positive feedback contradicts an existing negative. \
  Rare; leave empty unless the evidence is unambiguous.
- ``add_secondary`` adds keywords to ``secondary_skills`` (weight 1-3) \
  when positive feedback consistently mentions a skill not yet in the \
  profile. Skip if it's already in ``core_skills`` — promote that \
  separately.
- ``demote_keywords`` removes a keyword from any category. Use when a \
  keyword is clearly causing false-positive matches.

``confidence`` is a 0..1 estimate of how sure you are the patch reflects \
the user's actual preferences (vs. noise from a single bad day). Values \
< 0.6 will be staged for manual review rather than applied; calibrate \
honestly. ``rationale`` is one paragraph for the audit log explaining \
which feedback rows drove which fields — be specific.

Return an empty patch (all collections empty) with ``confidence`` ≥ 0.8 \
if the feedback batch has no learnable pattern. The system will stamp \
the rows as consumed without mutating the profile, which is the correct \
outcome for "everything was misclick".
"""


def _build_user_message(
    profile: dict[str, Any],
    feedback: list[FeedbackRow],
    job_titles: dict[str, str],
) -> Message:
    rows_payload: list[dict[str, Any]] = []
    for row in feedback:
        rows_payload.append(
            {
                "signal": row.signal,
                "title": job_titles.get(row.job_posting_id, "?"),
                "reason": row.reason or "",
            }
        )
    body = {
        "current_scoring_profile": profile,
        "feedback_rows": rows_payload,
    }
    return Message(
        role="user",
        content=(
            "Current target profile and the user's feedback rows:\n\n"
            f"{json.dumps(body, indent=2)}\n\n"
            "Return a ProfilePatch that reflects the most defensible "
            "adjustments. Be conservative."
        ),
    )


def _fetch_unapplied_feedback(
    supabase: Client, user_id: str, target_id: str, limit: int = 50
) -> list[FeedbackRow]:
    resp = (
        supabase.table("job_feedback")
        .select("*")
        .eq("user_id", user_id)
        .eq("target_id", target_id)
        .is_("applied_at", "null")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    rows = cast(list[dict[str, Any]], resp.data or [])
    return [_parse_row(r) for r in rows]


def _fetch_job_titles(
    supabase: Client, job_ids: list[str]
) -> dict[str, str]:
    if not job_ids:
        return {}
    # Deduplicate to keep the in_() filter sensible at scale.
    unique = list({jid for jid in job_ids if jid})
    resp = (
        supabase.table("jobs")
        .select("id, title")
        .in_("id", unique)
        .execute()
    )
    rows = cast(list[dict[str, Any]], resp.data or [])
    return {r["id"]: r.get("title", "?") for r in rows}


def _apply_patch_to_profile(
    profile: dict[str, Any], patch: ProfilePatch
) -> dict[str, Any]:
    """Pure function: returns a NEW profile dict with the patch applied.

    Leaves the input untouched so the caller can use it as ``prev_profile``
    in the audit log.
    """
    next_profile = json.loads(json.dumps(profile))  # deep copy via JSON

    # Negative keywords
    negative = next_profile.setdefault("negative", {})
    negative.setdefault("weight", -10.0)
    existing_neg: list[str] = negative.setdefault("keywords", [])
    existing_neg_set = {kw.lower() for kw in existing_neg}
    for kw in patch.add_negative:
        if kw.lower() not in existing_neg_set:
            existing_neg.append(kw)
            existing_neg_set.add(kw.lower())
    if patch.remove_negative:
        drop = {kw.lower() for kw in patch.remove_negative}
        negative["keywords"] = [kw for kw in existing_neg if kw.lower() not in drop]

    # Secondary skills
    if patch.add_secondary:
        categories = next_profile.setdefault("categories", {})
        secondary = categories.setdefault("secondary_skills", {})
        secondary.setdefault("weight", 1.0)
        keywords = secondary.setdefault("keywords", {})
        for kw, weight in patch.add_secondary.items():
            if kw not in keywords:
                keywords[kw] = max(1, min(3, int(weight)))

    # Demotions — remove from any category that holds them.
    if patch.demote_keywords:
        drop_set = {kw.lower() for kw in patch.demote_keywords}
        for _cat_name, cat in (next_profile.get("categories") or {}).items():
            kws = cat.get("keywords") or {}
            if isinstance(kws, dict):
                cat["keywords"] = {
                    k: v for k, v in kws.items() if k.lower() not in drop_set
                }

    return cast(dict[str, Any], next_profile)


def _insert_log(
    supabase: Client,
    *,
    user_id: str,
    target_id: str,
    status: LearningStatus,
    prev_profile: dict[str, Any],
    next_profile: dict[str, Any],
    patch: ProfilePatch,
    signals_consumed: int,
    applied_run_id: str | None,
) -> TargetLearningLogRow:
    payload: dict[str, Any] = {
        "user_id": user_id,
        "target_id": target_id,
        "status": status,
        "prev_profile": prev_profile,
        "next_profile": next_profile,
        "diff": patch.model_dump(mode="json"),
        "confidence": round(patch.confidence, 2),
        "rationale": patch.rationale,
        "signals_consumed": signals_consumed,
        "applied_run_id": applied_run_id,
    }
    resp = supabase.table(LEARNING_LOG_TABLE).insert(payload).execute()
    rows = cast(list[dict[str, Any]], resp.data or [])
    if not rows:
        raise RuntimeError("Failed to insert target_learning_log row")
    return TargetLearningLogRow.model_validate(rows[0])


def _stamp_consumed_feedback(
    supabase: Client, feedback_ids: list[str], run_id: str
) -> None:
    if not feedback_ids:
        return
    supabase.table("job_feedback").update(
        {
            "applied_at": datetime.now(UTC).isoformat(),
            "applied_run_id": run_id,
        }
    ).in_("id", feedback_ids).execute()


def _is_empty_patch(patch: ProfilePatch) -> bool:
    return (
        not patch.add_negative
        and not patch.remove_negative
        and not patch.add_secondary
        and not patch.demote_keywords
    )


async def run_llm_learner(
    supabase: Client,
    llm: LLMClient,
    *,
    user_id: str,
    target_id: str,
) -> LearningRunResult | None:
    """Run one LLM learn pass for (user, target).

    Returns ``None`` when there's nothing to learn from (below threshold).
    Returns a ``LearningRunResult`` when the LLM produced a patch — applied
    or staged depending on confidence. An "empty patch high confidence"
    response is treated as a no-op apply: feedback rows are stamped
    consumed so we don't keep re-asking the LLM about the same noise.
    """
    feedback = _fetch_unapplied_feedback(supabase, user_id, target_id)
    if len(feedback) < _MIN_FEEDBACK_FOR_LEARN:
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
    prev_profile = cast(dict[str, Any], target_row.get("scoring_profile") or {})

    job_titles = _fetch_job_titles(
        supabase, [r.job_posting_id for r in feedback]
    )

    patch, llm_result = await complete_json(
        llm,
        model=DEFAULT_MODEL,
        system=SYSTEM_PROMPT,
        messages=[_build_user_message(prev_profile, feedback, job_titles)],
        schema=ProfilePatch,
        purpose=DEFAULT_PURPOSE,
        cache_system=True,
    )
    enqueue_llm_cost(user_id, DEFAULT_PURPOSE, llm_result)

    run_id = str(uuid.uuid4())
    feedback_ids = [r.id for r in feedback]

    # Empty patch with high confidence: nothing to apply, but stamp the
    # feedback rows so we don't keep paying for the same Sonnet round-trip.
    if _is_empty_patch(patch):
        log = _insert_log(
            supabase,
            user_id=user_id,
            target_id=target_id,
            status="applied",
            prev_profile=prev_profile,
            next_profile=prev_profile,
            patch=patch,
            signals_consumed=len(feedback_ids),
            applied_run_id=run_id,
        )
        _stamp_consumed_feedback(supabase, feedback_ids, run_id)
        return LearningRunResult(
            log=log,
            applied=True,
            profile_version_after=cast(int, target_row.get("profile_version") or 1),
        )

    next_profile = _apply_patch_to_profile(prev_profile, patch)

    if patch.confidence < CONFIDENCE_AUTO_APPLY:
        # Stage for review — do NOT mutate the target or stamp feedback.
        log = _insert_log(
            supabase,
            user_id=user_id,
            target_id=target_id,
            status="staged",
            prev_profile=prev_profile,
            next_profile=next_profile,
            patch=patch,
            signals_consumed=len(feedback_ids),
            applied_run_id=None,
        )
        return LearningRunResult(log=log, applied=False)

    # Apply
    new_version = cast(int, target_row.get("profile_version") or 1) + 1
    supabase.table("targets").update(
        {
            "scoring_profile": next_profile,
            "profile_version": new_version,
            "updated_at": datetime.now(UTC).isoformat(),
        }
    ).eq("id", target_id).execute()

    log = _insert_log(
        supabase,
        user_id=user_id,
        target_id=target_id,
        status="applied",
        prev_profile=prev_profile,
        next_profile=next_profile,
        patch=patch,
        signals_consumed=len(feedback_ids),
        applied_run_id=run_id,
    )
    _stamp_consumed_feedback(supabase, feedback_ids, run_id)

    logger.info(
        "LLM learner applied for (user=%s, target=%s): +%d neg, +%d sec, "
        "-%d demoted, conf=%.2f, profile_version=%d",
        user_id,
        target_id,
        len(patch.add_negative),
        len(patch.add_secondary),
        len(patch.demote_keywords),
        patch.confidence,
        new_version,
    )
    return LearningRunResult(
        log=log, applied=True, profile_version_after=new_version
    )


def apply_staged_patch(
    supabase: Client, *, user_id: str, run_id: str
) -> LearningRunResult | None:
    """Take a staged patch + apply it. Returns None if no staged row matches."""
    log_resp = (
        supabase.table(LEARNING_LOG_TABLE)
        .select("*")
        .eq("id", run_id)
        .eq("user_id", user_id)
        .eq("status", "staged")
        .single()
        .execute()
    )
    log_row = cast(dict[str, Any] | None, log_resp.data)
    if log_row is None:
        return None

    target_id = log_row["target_id"]
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

    new_version = cast(int, target_row.get("profile_version") or 1) + 1
    supabase.table("targets").update(
        {
            "scoring_profile": log_row["next_profile"],
            "profile_version": new_version,
            "updated_at": datetime.now(UTC).isoformat(),
        }
    ).eq("id", target_id).execute()

    # Mark this run as applied + stamp the consumed feedback rows. The run
    # id we generate here is what gets attached to the feedback so the
    # audit thread links back to a single applied event even though the
    # log row was created earlier with status=staged.
    new_run_id = str(uuid.uuid4())
    update_resp = (
        supabase.table(LEARNING_LOG_TABLE)
        .update({"status": "applied", "applied_run_id": new_run_id})
        .eq("id", run_id)
        .execute()
    )
    rows = cast(list[dict[str, Any]], update_resp.data or [])
    if not rows:
        return None

    # Consume any feedback that's still unapplied for this target — these
    # are the rows that fed the original staged patch. If new feedback has
    # arrived since the stage, it gets consumed here too, which is the
    # correct behavior (the staged patch was the user's last decision).
    pending_resp = (
        supabase.table("job_feedback")
        .select("id")
        .eq("user_id", user_id)
        .eq("target_id", target_id)
        .is_("applied_at", "null")
        .execute()
    )
    pending_rows = cast(list[dict[str, Any]], pending_resp.data or [])
    pending_ids = [r["id"] for r in pending_rows]
    _stamp_consumed_feedback(supabase, pending_ids, new_run_id)

    return LearningRunResult(
        log=TargetLearningLogRow.model_validate(rows[0]),
        applied=True,
        profile_version_after=new_version,
    )


def reject_staged_patch(
    supabase: Client, *, user_id: str, run_id: str
) -> LearningRunResult | None:
    """Mark a staged patch as rejected. Does NOT stamp feedback as
    consumed — those rows stay unapplied so a future learn run can
    revisit them (the user said "no" to this *interpretation*, not to
    the underlying signal)."""
    resp = (
        supabase.table(LEARNING_LOG_TABLE)
        .update({"status": "rejected"})
        .eq("id", run_id)
        .eq("user_id", user_id)
        .eq("status", "staged")
        .execute()
    )
    rows = cast(list[dict[str, Any]], resp.data or [])
    if not rows:
        return None
    return LearningRunResult(
        log=TargetLearningLogRow.model_validate(rows[0]),
        applied=False,
    )
