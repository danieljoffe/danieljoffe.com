"""Conversation turns CRUD. Append-only.

Stores both onboarding and update chat history. Skipped questions are stored
as user turns with skipped=True so the LLM can see which prompts were declined.
"""

from typing import Any, cast

from supabase import Client

from app.models.experience import (
    ConversationTurn,
    ConversationType,
    TurnRole,
)

TABLE = "experience_conversation_turns"


def _scope_user(query: Any, user_id: str | None) -> Any:
    return query.is_("user_id", "null") if user_id is None else query.eq("user_id", user_id)


def list_turns(
    supabase: Client,
    user_id: str | None,
    conversation_type: ConversationType | None = None,
    limit: int = 200,
) -> list[ConversationTurn]:
    query = supabase.table(TABLE).select("*").order("created_at", desc=False).limit(limit)
    query = _scope_user(query, user_id)
    if conversation_type is not None:
        query = query.eq("conversation_type", conversation_type)
    resp = query.execute()
    rows = cast(list[dict[str, Any]], resp.data or [])
    return [ConversationTurn.model_validate(r) for r in rows]


def append(
    supabase: Client,
    user_id: str | None,
    conversation_type: ConversationType,
    role: TurnRole,
    content: str,
    skipped: bool = False,
    prose_doc_id: str | None = None,
) -> ConversationTurn:
    turns = list_turns(supabase, user_id, conversation_type=conversation_type, limit=1_000_000)
    next_index = len(turns) + 1
    resp = (
        supabase.table(TABLE)
        .insert(
            {
                "user_id": user_id,
                "conversation_type": conversation_type,
                "turn_index": next_index,
                "role": role,
                "content": content,
                "skipped": skipped,
                "prose_doc_id": prose_doc_id,
            }
        )
        .execute()
    )
    rows = cast(list[dict[str, Any]], resp.data or [])
    if not rows:
        raise RuntimeError("Failed to append conversation turn")
    return ConversationTurn.model_validate(rows[0])
