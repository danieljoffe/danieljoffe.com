"""Resume payload version history (F3-H).

Every `update_payload()` writes a snapshot row into `tailored_resume_versions`
before mutating the live payload. We cap free-tier history at 5 most recent
versions — older snapshots get pruned. The cap is enforced in Python rather
than via a Postgres trigger so it's easy to test, easy to lift per user, and
visible to anyone reading the service module.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, cast

from pydantic import BaseModel
from supabase import Client

VERSIONS_TABLE = "tailored_resume_versions"

VersionSource = Literal["initial", "user_edit", "llm_adapt"]

FREE_TIER_VERSION_CAP = 5
"""Versions retained per resume on the free tier. Paid tiers can lift this."""


class ResumeVersion(BaseModel):
    id: str
    resume_id: str
    payload: dict[str, Any]
    source: VersionSource
    created_at: datetime

    model_config = {"extra": "ignore"}


def record(
    supabase: Client,
    *,
    resume_id: str,
    payload: dict[str, Any],
    source: VersionSource,
) -> None:
    """Insert a version snapshot then prune anything beyond the free-tier cap.

    Failures are best-effort — never let a versioning hiccup break the live
    payload write that the caller is doing alongside this. The caller catches
    exceptions; here we only raise if the insert itself fails.
    """
    supabase.table(VERSIONS_TABLE).insert(
        {
            "resume_id": resume_id,
            "payload": payload,
            "source": source,
        }
    ).execute()
    _prune(supabase, resume_id=resume_id, keep=FREE_TIER_VERSION_CAP)


def list_for_resume(supabase: Client, resume_id: str) -> list[ResumeVersion]:
    """Most recent versions first. Capped at FREE_TIER_VERSION_CAP by storage."""
    resp = (
        supabase.table(VERSIONS_TABLE)
        .select("*")
        .eq("resume_id", resume_id)
        .order("created_at", desc=True)
        .limit(FREE_TIER_VERSION_CAP)
        .execute()
    )
    rows = cast(list[dict[str, Any]], resp.data or [])
    return [ResumeVersion.model_validate(r) for r in rows]


def _prune(supabase: Client, *, resume_id: str, keep: int) -> None:
    """Delete oldest versions beyond `keep`. Two-step (read ids, delete) keeps
    us in PostgREST without needing a custom RPC.
    """
    resp = (
        supabase.table(VERSIONS_TABLE)
        .select("id")
        .eq("resume_id", resume_id)
        .order("created_at", desc=True)
        .execute()
    )
    rows = cast(list[dict[str, Any]], resp.data or [])
    if len(rows) <= keep:
        return
    expired_ids = [r["id"] for r in rows[keep:]]
    supabase.table(VERSIONS_TABLE).delete().in_("id", expired_ids).execute()
