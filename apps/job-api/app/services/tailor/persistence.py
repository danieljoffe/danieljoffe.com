"""Persistence + Supabase Storage for tailored_resumes.

The pipeline produces a TailoredResume or TailoredCoverLetter + `.docx`
bytes + cost metadata. This module handles:
- uploading the `.docx` to Supabase Storage (bucket: tailored-resumes),
- inserting the metadata row with a document_type discriminator,
- reading rows back for listing / download endpoints.

Lint failures do NOT reach this module — the router returns 422 before
anything gets persisted.
"""

from __future__ import annotations

import hashlib
from typing import Any, cast

from supabase import Client

from app.models.llm import LLMResult
from app.models.tailor import (
    DocumentType,
    TailoredCoverLetter,
    TailoredResume,
    TailoredResumeRecord,
)

TABLE = "tailored_resumes"
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


def _insert_row(supabase: Client, row: dict[str, Any]) -> TailoredResumeRecord:
    resp = supabase.table(TABLE).insert(row).execute()
    rows = cast(list[dict[str, Any]], resp.data or [])
    if not rows:
        raise RuntimeError("Failed to insert tailored_resumes row")
    return TailoredResumeRecord.model_validate(rows[0])


def persist(
    supabase: Client,
    *,
    user_id: str | None,
    job_posting_id: str | None,
    resume: TailoredResume,
    job_description: str,
    warnings: list[str],
    llm_result: LLMResult,
    storage_path: str | None,
) -> TailoredResumeRecord:
    """Insert one tailored_resumes row for a resume."""
    row: dict[str, Any] = {
        "user_id": user_id,
        "job_posting_id": job_posting_id,
        "document_type": "resume",
        "resume_type": resume.resume_type,
        "jd_snapshot": job_description,
        "jd_snapshot_hash": jd_hash(job_description),
        "payload": resume.model_dump(mode="json"),
        "storage_path": storage_path,
        "warnings": warnings,
        "model": llm_result.model,
        "input_tokens": llm_result.usage.input_tokens,
        "output_tokens": llm_result.usage.output_tokens,
        "cost_usd": llm_result.cost_usd,
        "latency_ms": llm_result.latency_ms,
    }
    return _insert_row(supabase, row)


def persist_cover_letter(
    supabase: Client,
    *,
    user_id: str | None,
    job_posting_id: str | None,
    letter: TailoredCoverLetter,
    job_description: str,
    warnings: list[str],
    llm_result: LLMResult,
    storage_path: str | None,
) -> TailoredResumeRecord:
    """Insert one tailored_resumes row for a cover letter.

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
        "storage_path": storage_path,
        "warnings": warnings,
        "model": llm_result.model,
        "input_tokens": llm_result.usage.input_tokens,
        "output_tokens": llm_result.usage.output_tokens,
        "cost_usd": llm_result.cost_usd,
        "latency_ms": llm_result.latency_ms,
    }
    return _insert_row(supabase, row)


def get(supabase: Client, resume_id: str) -> TailoredResumeRecord | None:
    resp = (
        supabase.table(TABLE).select("*").eq("id", resume_id).single().execute()
    )
    if not resp.data:
        return None
    return TailoredResumeRecord.model_validate(cast(dict[str, Any], resp.data))


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
