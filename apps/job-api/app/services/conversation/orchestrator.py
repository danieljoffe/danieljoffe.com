"""Conversation orchestrator.

Three entry points:
- `handle_turn(...)` — processes one user turn in onboarding or update mode,
  persists the assistant's reply, and appends to the prose doc if the LLM
  determined fresh career content was shared.
- `reset_content(...)` — destructive wipe of prose/optimized/chunks/turns.
  Preferences survive (they have their own DELETE endpoint).
- `next_probe(...)` — pure orchestration over the gap tracker + LLM: find
  the top-priority gap, ask the LLM to phrase it as a question.

Auto-derivation is NOT triggered on every turn — that would add LLM cost
to every conversation tick. The user calls POST /experience/derive when
they want the optimized doc regenerated from accumulated prose.
"""

from __future__ import annotations

import contextlib
import json
from typing import Any, cast

from supabase import Client

from app.models.conversation import (
    LLMTurnResponse,
    ProbeResult,
    ResetResult,
    TurnResult,
)
from app.models.experience import AnnotationCreate, ConversationType
from app.models.llm import Message, ModelId
from app.services.conversation.prompts import (
    ONBOARDING_SYSTEM,
    PROBE_SYSTEM,
    UPDATE_SYSTEM,
)
from app.services.experience import annotations as annotation_svc
from app.services.experience import gap_tracker, optimized, prose, turns
from app.services.llm import cost_log
from app.services.llm.client import LLMClient, complete_json

PURPOSE_TURN_ONBOARDING = "conversation.onboarding"
PURPOSE_TURN_UPDATE = "conversation.update"
PURPOSE_PROBE = "conversation.probe"

DEFAULT_TURN_MODEL: ModelId = "claude-haiku-4-5"
"""Haiku for interactive turns — latency matters, reasoning demands are modest."""

DEFAULT_PROBE_MODEL: ModelId = "claude-haiku-4-5"
"""Haiku for phrasing a probe — one-sentence output from structured input."""


def _system_for(conv_type: ConversationType) -> str:
    return ONBOARDING_SYSTEM if conv_type == "onboarding" else UPDATE_SYSTEM


def _purpose_for(conv_type: ConversationType) -> str:
    return (
        PURPOSE_TURN_ONBOARDING
        if conv_type == "onboarding"
        else PURPOSE_TURN_UPDATE
    )


def _history_as_messages(
    history: list[Any],
    latest_user_content: str,
) -> list[Message]:
    """Convert persisted turns + the current user content into LLM messages.

    Assistant and user turns become the conversation history. `system`
    turns are skipped — they're metadata, not chat content.
    Skipped user turns are annotated inline so the LLM knows the user declined.
    """
    out: list[Message] = []
    for t in history:
        if t.role == "system":
            continue
        if t.role == "user" and t.skipped:
            out.append(Message(role="user", content="[skipped question]"))
        else:
            out.append(Message(role=t.role, content=t.content))
    out.append(Message(role="user", content=latest_user_content))
    return out


async def handle_turn(
    supabase: Client,
    llm: LLMClient,
    *,
    user_id: str | None,
    conversation_type: ConversationType,
    user_content: str,
    skipped: bool,
) -> TurnResult:
    """Persist the user turn, run the LLM, persist the assistant reply,
    and optionally append to the prose doc."""
    history = turns.list_turns(
        supabase,
        user_id=user_id,
        conversation_type=conversation_type,
        limit=1_000_000,
    )
    current_prose = prose.get_latest(supabase, user_id=user_id)

    turns.append(
        supabase,
        user_id=user_id,
        conversation_type=conversation_type,
        role="user",
        content=user_content,
        skipped=skipped,
        prose_doc_id=current_prose.id if current_prose else None,
    )

    messages = _history_as_messages(
        history, "[skipped question]" if skipped else user_content
    )
    if current_prose and current_prose.content.strip():
        messages.insert(
            0,
            Message(
                role="user",
                content=(
                    "[context: current prose doc]\n" + current_prose.content
                ),
            ),
        )

    purpose = _purpose_for(conversation_type)
    parsed, result = await complete_json(
        llm,
        model=DEFAULT_TURN_MODEL,
        system=_system_for(conversation_type),
        messages=messages,
        schema=LLMTurnResponse,
        purpose=purpose,
        cache_system=True,
    )
    cost_log.record(
        supabase,
        user_id=user_id,
        purpose=purpose,
        result=result,
        metadata={"conversation_type": conversation_type},
    )

    new_prose_version: int | None = None
    prose_updated = False
    if parsed.prose_append and parsed.prose_append.strip():
        existing = current_prose.content if current_prose else ""
        new_content = (
            (existing + "\n\n" + parsed.prose_append.strip()).strip()
            if existing
            else parsed.prose_append.strip()
        )
        new_doc = prose.create_version(
            supabase, user_id=user_id, content=new_content
        )
        new_prose_version = new_doc.version
        prose_updated = True

    # Persist annotation directive if the LLM parsed one (#499).
    # ValueError is raised when no optimized doc exists yet — skip silently.
    if parsed.annotation:
        with contextlib.suppress(ValueError):
            annotation_svc.add_annotation(
                supabase,
                user_id=user_id,
                body=AnnotationCreate(
                    action=parsed.annotation.action,
                    ref_type=parsed.annotation.ref_type,
                    ref_value=parsed.annotation.ref_value,
                    target_label=parsed.annotation.target_label,
                    reason=parsed.annotation.reason,
                ),
            )

    turns.append(
        supabase,
        user_id=user_id,
        conversation_type=conversation_type,
        role="assistant",
        content=parsed.assistant_message,
        skipped=False,
        prose_doc_id=None,
    )

    return TurnResult(
        assistant_message=parsed.assistant_message,
        prose_updated=prose_updated,
        prose_version=new_prose_version,
        done=parsed.done,
    )


def reset_content(
    supabase: Client,
    *,
    user_id: str | None,
) -> ResetResult:
    """Wipe prose, optimized (chunks cascade), and turns. Preserve preferences."""

    def _scoped(table: str) -> Any:
        q = supabase.table(table).delete()
        return q.is_("user_id", "null") if user_id is None else q.eq("user_id", user_id)

    prose_resp = _scoped("experience_prose_docs").execute()
    optimized_resp = _scoped("experience_optimized_docs").execute()
    turns_resp = _scoped("experience_conversation_turns").execute()

    prose_deleted = len(cast(list[Any], prose_resp.data or []))
    optimized_deleted = len(cast(list[Any], optimized_resp.data or []))
    turns_deleted = len(cast(list[Any], turns_resp.data or []))

    return ResetResult(
        prose_versions_deleted=prose_deleted,
        optimized_versions_deleted=optimized_deleted,
        turns_deleted=turns_deleted,
    )


async def next_probe(
    supabase: Client,
    llm: LLMClient,
    *,
    user_id: str | None,
) -> ProbeResult:
    """Find the top-priority gap and phrase it as a user-facing question."""
    current = optimized.get_latest(supabase, user_id=user_id)
    if current is None:
        return ProbeResult(
            question=(
                "Tell me about your most recent role — company, title, and one "
                "win you'd lead with."
            ),
            gap=None,
        )

    gap = gap_tracker.top_gap(current.payload)
    if gap is None:
        return ProbeResult(
            question="Your optimized doc looks complete. Share what you shipped this week.",
            gap=None,
        )

    result = await llm.complete(
        model=DEFAULT_PROBE_MODEL,
        system=PROBE_SYSTEM,
        messages=[Message(role="user", content=json.dumps(gap.model_dump()))],
        purpose=PURPOSE_PROBE,
        cache_system=True,
    )
    cost_log.record(
        supabase,
        user_id=user_id,
        purpose=PURPOSE_PROBE,
        result=result,
        metadata={"gap_kind": gap.kind, "gap_ref": gap.ref},
    )

    question = result.content.strip().strip('"').strip()
    return ProbeResult(question=question, gap=gap)
