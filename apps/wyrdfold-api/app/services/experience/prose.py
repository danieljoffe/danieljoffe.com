"""Prose doc CRUD. Versioned, append-only.

The prose doc is the user's narrative source of truth. Every new version
is a full snapshot — we do not diff. Callers that want to "append" should
fetch the latest, concatenate, and create a new version.
"""

from typing import Any, cast

from supabase import Client

from app.models.experience import ProseDoc

TABLE = "experience_prose_docs"


def get_latest(supabase: Client, user_id: str | None) -> ProseDoc | None:
    query = supabase.table(TABLE).select("*").order("version", desc=True).limit(1)
    query = query.is_("user_id", "null") if user_id is None else query.eq("user_id", user_id)
    resp = query.execute()
    rows = cast(list[dict[str, Any]], resp.data or [])
    if not rows:
        return None
    return ProseDoc.model_validate(rows[0])


def list_versions(supabase: Client, user_id: str | None, limit: int = 50) -> list[ProseDoc]:
    query = supabase.table(TABLE).select("*").order("version", desc=True).limit(limit)
    query = query.is_("user_id", "null") if user_id is None else query.eq("user_id", user_id)
    resp = query.execute()
    rows = cast(list[dict[str, Any]], resp.data or [])
    return [ProseDoc.model_validate(r) for r in rows]


def create_version(supabase: Client, user_id: str | None, content: str) -> ProseDoc:
    latest = get_latest(supabase, user_id)
    next_version = (latest.version + 1) if latest else 1
    resp = (
        supabase.table(TABLE)
        .insert(
            {
                "user_id": user_id,
                "version": next_version,
                "content": content,
            }
        )
        .execute()
    )
    rows = cast(list[dict[str, Any]], resp.data or [])
    if not rows:
        raise RuntimeError("Failed to insert prose doc version")
    return ProseDoc.model_validate(rows[0])
