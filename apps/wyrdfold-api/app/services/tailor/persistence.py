"""Persistence + Supabase Storage for documents.

The pipeline produces a TailoredResume or TailoredCoverLetter + `.docx`
bytes + cost metadata. This module handles:
- uploading the `.docx` to Supabase Storage (bucket: tailored-resumes),
- inserting the metadata row with a document_type discriminator,
- reading rows back for listing / download endpoints.

Markdown is the new source of truth: every persist() also writes
`payload_md` (canonical markdown serialization) and
`docx_payload_md_hash` (cache key for the rendered .docx). The
structured `payload` JSONB column stays in place during transition.

Lint failures do NOT reach this module — the router returns 422 before
anything gets persisted.
"""

from __future__ import annotations

import hashlib
from datetime import UTC, datetime
from typing import Any, cast

from supabase import Client

from app.models.llm import LLMResult
from app.models.tailor import (
    DocumentType,
    TailoredCoverLetter,
    TailoredResume,
    TailoredResumeRecord,
)
from app.services.docx.pandoc_render import md_payload_hash
from app.services.tailor import versions

TABLE = "documents"
STORAGE_BUCKET = "tailored-resumes"
DOCX_CONTENT_TYPE = (
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
)


def jd_hash(job_description: str) -> str:
    """Stable hash of the JD text. Lets the dashboard dedupe or link
    multiple tailorings for the same posting.
    """
    return hashlib.sha256(job_description.encode("utf-8")).hexdigest()


def _storage_path(user_id: str | None, resume_id: str) -> str:
    return f"{user_id or 'anon'}/{resume_id}.docx"


def upload_docx(
    supabase: Client,
    *,
    user_id: str | None,
    resume_id: str,
    docx_bytes: bytes,
) -> str:
    """Upload to Supabase Storage. Returns the storage path."""
    path = _storage_path(user_id, resume_id)
    supabase.storage.from_(STORAGE_BUCKET).upload(
        path=path,
        file=docx_bytes,
        file_options={"content-type": DOCX_CONTENT_TYPE, "upsert": "true"},
    )
    return path


def download_docx(supabase: Client, storage_path: str) -> bytes:
    return supabase.storage.from_(STORAGE_BUCKET).download(storage_path)


def insert_row(
    supabase: Client,
    row: dict[str, Any],
    *,
    payload_md: str | None = None,
) -> TailoredResumeRecord:
    resp = supabase.table(TABLE).insert(row).execute()
    rows = cast(list[dict[str, Any]], resp.data or [])
    if not rows:
        raise RuntimeError("Failed to insert documents row")
    record = TailoredResumeRecord.model_validate(rows[0])
    # F3-H: capture the initial payload as version 1.
    versions.record(
        supabase,
        resume_id=record.id,
        payload=record.payload,
        source="initial",
        payload_md=payload_md,
    )
    return record


def persist(
    supabase: Client,
    *,
    user_id: str | None,
    job_posting_id: str | None,
    resume: TailoredResume,
    payload_md: str,
    job_description: str,
    warnings: list[str],
    llm_result: LLMResult,
    storage_path: str | None,
) -> TailoredResumeRecord:
    """Insert one documents row for a resume."""
    row: dict[str, Any] = {
        "user_id": user_id,
        "job_posting_id": job_posting_id,
        "document_type": "resume",
        "resume_type": resume.resume_type,
        "jd_snapshot": job_description,
        "jd_snapshot_hash": jd_hash(job_description),
        "payload": resume.model_dump(mode="json"),
        "payload_md": payload_md,
        "docx_payload_md_hash": md_payload_hash(payload_md),
        "storage_path": storage_path,
        "warnings": warnings,
        "model": llm_result.model,
        "input_tokens": llm_result.usage.input_tokens,
        "output_tokens": llm_result.usage.output_tokens,
        "cost_usd": llm_result.cost_usd,
        "latency_ms": llm_result.latency_ms,
    }
    return insert_row(supabase, row, payload_md=payload_md)


def persist_cover_letter(
    supabase: Client,
    *,
    user_id: str | None,
    job_posting_id: str | None,
    letter: TailoredCoverLetter,
    payload_md: str,
    job_description: str,
    warnings: list[str],
    llm_result: LLMResult,
    storage_path: str | None,
) -> TailoredResumeRecord:
    """Insert one documents row for a cover letter.

    `resume_type` is set to 'generic' since the column is NOT NULL; it's
    ignored on reads when `document_type == 'cover_letter'`.
    """
    row: dict[str, Any] = {
        "user_id": user_id,
        "job_posting_id": job_posting_id,
        "document_type": "cover_letter",
        "resume_type": "generic",
        "jd_snapshot": job_description,
        "jd_snapshot_hash": jd_hash(job_description),
        "payload": letter.model_dump(mode="json"),
        "payload_md": payload_md,
        "docx_payload_md_hash": md_payload_hash(payload_md),
        "storage_path": storage_path,
        "warnings": warnings,
        "model": llm_result.model,
        "input_tokens": llm_result.usage.input_tokens,
        "output_tokens": llm_result.usage.output_tokens,
        "cost_usd": llm_result.cost_usd,
        "latency_ms": llm_result.latency_ms,
    }
    return insert_row(supabase, row, payload_md=payload_md)


def get(
    supabase: Client,
    resume_id: str,
    *,
    user_id: str | None,
) -> TailoredResumeRecord | None:
    """Fetch a tailored document, scoped to the caller.

    Filters by both ``id`` AND ``user_id`` so a JWT caller never reads
    another user's document by guessing the UUID — the service-role
    client used here bypasses RLS, so the scoping has to be enforced
    at the query layer.

    ``user_id=None`` matches the legacy single-tenant rows (api-key
    cron/poller paths), mirroring the convention used by
    ``list_recent`` and the upsert paths. Routes that accept JWT
    callers thread ``get_current_user_id_optional`` through; pass that
    same value here.

    Returns ``None`` both when the row doesn't exist AND when it
    exists but belongs to another user — same response so we don't
    leak the existence of cross-tenant rows.
    """
    query = supabase.table(TABLE).select("*").eq("id", resume_id)
    query = query.is_("user_id", "null") if user_id is None else query.eq("user_id", user_id)
    resp = query.single().execute()
    if not resp.data:
        return None
    return TailoredResumeRecord.model_validate(cast(dict[str, Any], resp.data))


def _scope_to_user(query: Any, user_id: str | None) -> Any:
    """Apply the standard ``(id-only) → (id + user_id)`` scoping the
    persistence helpers all share. Centralising the conditional keeps
    the five mutation functions below identical in shape, so a future
    change (e.g., a third tenant mode) only happens in one place.
    """
    if user_id is None:
        return query.is_("user_id", "null")
    return query.eq("user_id", user_id)


def update_payload(
    supabase: Client,
    resume_id: str,
    payload_dict: dict[str, Any],
    storage_path: str | None = None,
    version_source: versions.VersionSource = "user_edit",
    *,
    user_id: str | None,
) -> TailoredResumeRecord:
    """Update the payload JSONB and set updated_at. Optionally update storage_path.

    Records a version snapshot before the update lands so history is captured
    even if the live update fails between snapshot and commit (F3-H).

    Defense-in-depth (post-#714): scopes the update by ``user_id`` in
    addition to ``id`` so a future caller that bypasses the route's
    ``persistence.get`` ownership check still can't cross-tenant.
    Same convention as ``persistence.get`` — ``user_id=None`` matches
    the legacy single-tenant rows.
    """
    versions.record(
        supabase,
        resume_id=resume_id,
        payload=payload_dict,
        source=version_source,
    )
    updates: dict[str, Any] = {
        "payload": payload_dict,
        "updated_at": "now()",
    }
    if storage_path is not None:
        updates["storage_path"] = storage_path
    query = supabase.table(TABLE).update(updates).eq("id", resume_id)
    resp = _scope_to_user(query, user_id).execute()
    rows = cast(list[dict[str, Any]], resp.data or [])
    if not rows:
        raise RuntimeError(f"Failed to update documents row {resume_id}")
    return TailoredResumeRecord.model_validate(rows[0])


def update_payload_md(
    supabase: Client,
    resume_id: str,
    payload_md: str,
    *,
    user_id: str | None,
) -> TailoredResumeRecord:
    """Update the markdown payload and invalidate the cached docx hash.

    The next download endpoint call will detect the hash mismatch and
    re-render via pandoc, then update both the storage_path bytes and
    docx_payload_md_hash. We don't re-render eagerly here so save is
    cheap (no pandoc subprocess on every keystroke / autosave).

    Autosave is deliberately decoupled from version history: callers
    that need a snapshot (session-end flush, before approve, before
    re-adapt) call `versions.checkpoint` separately. That keeps the
    free-tier version cap from being flooded by routine keystrokes.

    Defense-in-depth (post-#714): see ``update_payload``.
    """
    updates: dict[str, Any] = {
        "payload_md": payload_md,
        # Invalidate the docx cache: NULL signals "render needed" to the
        # download endpoint. We explicitly DO NOT set the new hash here —
        # it's set after pandoc renders successfully so a failed render
        # doesn't leave the hash claiming bytes that don't exist.
        "docx_payload_md_hash": None,
        "updated_at": "now()",
    }
    query = supabase.table(TABLE).update(updates).eq("id", resume_id)
    resp = _scope_to_user(query, user_id).execute()
    rows = cast(list[dict[str, Any]], resp.data or [])
    if not rows:
        raise RuntimeError(f"Failed to update documents row {resume_id}")
    return TailoredResumeRecord.model_validate(rows[0])


def mark_docx_rendered(
    supabase: Client,
    resume_id: str,
    *,
    storage_path: str,
    payload_md_hash: str,
    user_id: str | None,
) -> None:
    """Record that the docx for `payload_md_hash` is uploaded to storage_path.

    Called after a successful pandoc render + storage upload so future
    downloads can serve the cached bytes when the markdown hasn't
    changed.

    Defense-in-depth (post-#714): see ``update_payload``.
    """
    query = supabase.table(TABLE).update(
        {
            "storage_path": storage_path,
            "docx_payload_md_hash": payload_md_hash,
        }
    ).eq("id", resume_id)
    _scope_to_user(query, user_id).execute()


def mark_job_resume_draft(supabase: Client, job_posting_id: str) -> None:
    """Advance a job posting to status='resume_draft'.

    Called after a tailored resume is persisted (single, batch, or reuse
    clone). Idempotent — re-running with an already-draft job is a no-op
    update. We unconditionally set the status because re-generation
    supersedes any prior draft/approval.
    """
    supabase.table("jobs").update(
        {
            "status": "resume_draft",
            "updated_at": datetime.now(UTC).isoformat(),
        }
    ).eq("id", job_posting_id).execute()


def approve(
    supabase: Client, resume_id: str, *, user_id: str | None
) -> TailoredResumeRecord:
    """Set approved_at on a tailored resume.

    Defense-in-depth (post-#714): see ``update_payload``.
    """
    query = supabase.table(TABLE).update({"approved_at": "now()"}).eq("id", resume_id)
    resp = _scope_to_user(query, user_id).execute()
    rows = cast(list[dict[str, Any]], resp.data or [])
    if not rows:
        raise RuntimeError(f"Failed to approve documents row {resume_id}")
    return TailoredResumeRecord.model_validate(rows[0])


def unapprove(
    supabase: Client, resume_id: str, *, user_id: str | None
) -> TailoredResumeRecord:
    """Clear approved_at on a tailored resume — reopens it for editing.

    Defense-in-depth (post-#714): see ``update_payload``.
    """
    query = supabase.table(TABLE).update({"approved_at": None}).eq("id", resume_id)
    resp = _scope_to_user(query, user_id).execute()
    rows = cast(list[dict[str, Any]], resp.data or [])
    if not rows:
        raise RuntimeError(f"Failed to unapprove documents row {resume_id}")
    return TailoredResumeRecord.model_validate(rows[0])


def get_by_job(
    supabase: Client,
    job_posting_id: str,
    *,
    user_id: str | None,
    document_type: DocumentType = "resume",
) -> TailoredResumeRecord | None:
    """Fetch the most recent tailored document of a given type for a job posting.

    Scoped to the caller via ``user_id`` so the route never returns
    another user's tailored doc for the same (globally-shared)
    job posting. ``user_id=None`` matches legacy single-tenant rows.
    """
    query = (
        supabase.table(TABLE)
        .select("*")
        .eq("job_posting_id", job_posting_id)
        .eq("document_type", document_type)
    )
    query = query.is_("user_id", "null") if user_id is None else query.eq("user_id", user_id)
    resp = (
        query.order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    rows = cast(list[dict[str, Any]], resp.data or [])
    if not rows:
        return None
    return TailoredResumeRecord.model_validate(rows[0])


def list_recent(
    supabase: Client,
    *,
    user_id: str | None,
    limit: int = 50,
    document_type: DocumentType | None = None,
) -> list[TailoredResumeRecord]:
    query = supabase.table(TABLE).select("*").order("created_at", desc=True).limit(limit)
    query = query.is_("user_id", "null") if user_id is None else query.eq("user_id", user_id)
    if document_type is not None:
        query = query.eq("document_type", document_type)
    resp = query.execute()
    rows = cast(list[dict[str, Any]], resp.data or [])
    return [TailoredResumeRecord.model_validate(r) for r in rows]
