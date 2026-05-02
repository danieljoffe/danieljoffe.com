"""Optimized doc CRUD. Versioned.

LLM generates a new version from the current prose doc. User edits also create
a new version with source='user_edit'. Version history preserves LLM drafts
and manual edits alongside each other so nothing is silently clobbered.
"""

from typing import Any, cast

from supabase import Client

from app.cache import TTLCache
from app.models.experience import (
    OptimizedDoc,
    OptimizedDocSource,
    OptimizedPayload,
)

TABLE = "experience_optimized_docs"

# The optimized doc is read on most endpoints (tailor, analysis, derive,
# suggest, target create) but mutates only when a new version is created.
# A short TTL cache turns most hits into in-memory dict lookups; the cache
# is invalidated synchronously in create_version().
_doc_cache: TTLCache = TTLCache(ttl=60.0, max_size=8)


def _cache_key(user_id: str | None) -> str:
    return f"optimized_latest:{user_id or '__null__'}"


def get_latest(supabase: Client, user_id: str | None) -> OptimizedDoc | None:
    cache_key = _cache_key(user_id)
    cached: OptimizedDoc | None = _doc_cache.get(cache_key)
    if cached is not None:
        return cached

    query = supabase.table(TABLE).select("*").order("version", desc=True).limit(1)
    query = query.is_("user_id", "null") if user_id is None else query.eq("user_id", user_id)
    resp = query.execute()
    rows = cast(list[dict[str, Any]], resp.data or [])
    if not rows:
        return None
    doc = OptimizedDoc.model_validate(rows[0])
    _doc_cache.set(cache_key, doc)
    return doc


def list_versions(supabase: Client, user_id: str | None, limit: int = 50) -> list[OptimizedDoc]:
    query = supabase.table(TABLE).select("*").order("version", desc=True).limit(limit)
    query = query.is_("user_id", "null") if user_id is None else query.eq("user_id", user_id)
    resp = query.execute()
    rows = cast(list[dict[str, Any]], resp.data or [])
    return [OptimizedDoc.model_validate(r) for r in rows]


def create_version(
    supabase: Client,
    user_id: str | None,
    payload: OptimizedPayload,
    prose_doc_id: str | None,
    source: OptimizedDocSource,
    markdown_view: str | None = None,
) -> OptimizedDoc:
    latest = get_latest(supabase, user_id)
    next_version = (latest.version + 1) if latest else 1
    resp = (
        supabase.table(TABLE)
        .insert(
            {
                "user_id": user_id,
                "prose_doc_id": prose_doc_id,
                "version": next_version,
                "payload": payload.model_dump(mode="json"),
                "markdown_view": markdown_view,
                "source": source,
            }
        )
        .execute()
    )
    rows = cast(list[dict[str, Any]], resp.data or [])
    if not rows:
        raise RuntimeError("Failed to insert optimized doc version")
    doc = OptimizedDoc.model_validate(rows[0])
    _doc_cache.invalidate(_cache_key(user_id))
    return doc
