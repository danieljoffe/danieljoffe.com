"""Preferences CRUD. One row per user_id (unique).

Persistent style bias the LLM reads on every tailoring.
Reset by deleting the row — this is also what re-running onboarding does.
"""

from datetime import UTC, datetime
from typing import Any, cast

from supabase import Client

from app.models.experience import Preferences, PreferencesPayload

TABLE = "experience_preferences"


def get(supabase: Client, user_id: str | None) -> Preferences | None:
    query = supabase.table(TABLE).select("*").limit(1)
    query = query.is_("user_id", "null") if user_id is None else query.eq("user_id", user_id)
    resp = query.execute()
    rows = cast(list[dict[str, Any]], resp.data or [])
    if not rows:
        return None
    return Preferences.model_validate(rows[0])


def upsert(
    supabase: Client,
    user_id: str | None,
    payload: PreferencesPayload,
) -> Preferences:
    existing = get(supabase, user_id)
    now_iso = datetime.now(UTC).isoformat()
    row: dict[str, Any] = {
        "payload": payload.model_dump(mode="json"),
        "updated_at": now_iso,
    }
    if existing is None:
        row["user_id"] = user_id
        resp = supabase.table(TABLE).insert(row).execute()
    else:
        resp = supabase.table(TABLE).update(row).eq("id", existing.id).execute()
    rows = cast(list[dict[str, Any]], resp.data or [])
    if not rows:
        raise RuntimeError("Failed to upsert preferences")
    return Preferences.model_validate(rows[0])


def reset(supabase: Client, user_id: str | None) -> None:
    query = supabase.table(TABLE).delete()
    query = query.is_("user_id", "null") if user_id is None else query.eq("user_id", user_id)
    query.execute()
