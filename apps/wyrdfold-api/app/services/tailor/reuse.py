"""Resume reuse within targets (#504).

When a target already has a generated resume for one job, check whether
a new job's JD is similar enough to reuse that resume instead of
generating from scratch.

Similarity is measured by keyword overlap from the target's scoring
profile — no embedding calls needed. If two JDs hit >= 70% of the same
profile keywords (Jaccard), the existing resume is cloned with zero LLM
cost.
"""

from __future__ import annotations

from typing import Any, cast

from supabase import Client

from app.models.tailor import TailoredResumeRecord
from app.models.targets import ScoringProfile
from app.services.tailor.persistence import insert_row, jd_hash

SIMILARITY_THRESHOLD = 0.70


def extract_profile_keywords(profile: ScoringProfile) -> set[str]:
    """Extract all keywords from all categories in a scoring profile.

    Returns lowercased keyword set for case-insensitive matching.
    """
    keywords: set[str] = set()
    for cat in profile.categories.values():
        keywords.update(k.lower() for k in cat.keywords)
    return keywords


def _keyword_hits(jd_text: str, keywords: set[str]) -> set[str]:
    """Which profile keywords appear in a JD (case-insensitive substring match)."""
    jd_lower = jd_text.lower()
    return {kw for kw in keywords if kw in jd_lower}


def jd_similarity(
    jd_a: str,
    jd_b: str,
    profile_keywords: set[str],
) -> float:
    """Jaccard similarity of keyword hits between two JDs.

    Returns 0.0–1.0. Higher means more similar.
    Returns 0.0 when no keywords hit either JD.
    """
    hits_a = _keyword_hits(jd_a, profile_keywords)
    hits_b = _keyword_hits(jd_b, profile_keywords)
    union = hits_a | hits_b
    if not union:
        return 0.0
    return len(hits_a & hits_b) / len(union)


def find_reusable_resume(
    supabase: Client,
    *,
    target_id: str,
    job_description: str,
    profile_keywords: set[str],
) -> TailoredResumeRecord | None:
    """Find an existing resume in the same target similar enough to reuse.

    Queries documents for jobs sharing the same target_id.
    Returns the best match above SIMILARITY_THRESHOLD, or None.
    """
    # Get job_posting_ids in this target
    jp_resp = (
        supabase.table("jobs")
        .select("id")
        .eq("target_id", target_id)
        .execute()
    )
    jp_ids = [cast(dict[str, Any], r)["id"] for r in (jp_resp.data or [])]
    if not jp_ids:
        return None

    # Get recent resumes for those job postings
    resp = (
        supabase.table("documents")
        .select("*")
        .in_("job_posting_id", jp_ids)
        .eq("document_type", "resume")
        .order("created_at", desc=True)
        .limit(10)
        .execute()
    )
    rows = cast(list[dict[str, Any]], resp.data or [])

    best_record: TailoredResumeRecord | None = None
    best_sim = 0.0

    for row in rows:
        jd_snapshot = row.get("jd_snapshot", "")
        sim = jd_similarity(job_description, jd_snapshot, profile_keywords)
        if sim >= SIMILARITY_THRESHOLD and sim > best_sim:
            best_sim = sim
            best_record = TailoredResumeRecord.model_validate(row)

    return best_record


def clone_resume_for_job(
    supabase: Client,
    *,
    source: TailoredResumeRecord,
    job_posting_id: str,
    job_description: str,
    user_id: str | None,
) -> TailoredResumeRecord:
    """Create a new documents row that clones an existing resume.

    Same payload, same storage_path (docx), linked to a different
    job_posting. source_resume_id tracks the lineage. Zero LLM cost.
    """
    row: dict[str, Any] = {
        "user_id": user_id,
        "job_posting_id": job_posting_id,
        "document_type": source.document_type,
        "resume_type": source.resume_type,
        "jd_snapshot": job_description,
        "jd_snapshot_hash": jd_hash(job_description),
        "payload": source.payload,
        "payload_md": source.payload_md,
        "docx_payload_md_hash": source.docx_payload_md_hash,
        "storage_path": source.storage_path,
        "warnings": [*source.warnings, "reused_from_similar_job"],
        "model": source.model,
        "input_tokens": 0,
        "output_tokens": 0,
        "cost_usd": 0.0,
        "latency_ms": 0,
        "source_resume_id": source.id,
    }
    return insert_row(supabase, row, payload_md=source.payload_md)
