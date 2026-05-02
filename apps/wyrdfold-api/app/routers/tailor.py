"""Tailor router.

POST  /tailor/resume                    — synthesize + render + lint + persist a resume.
POST  /tailor/cover-letter              — same pipeline shape, for cover letters.
GET   /tailor/resumes                   — recent resume tailorings.
GET   /tailor/cover-letters             — recent cover-letter tailorings.
GET   /tailor/resumes/by-job/{id}       — most recent resume for a job posting.
POST  /tailor/resumes/export-zip        — bulk .docx download as zip.
PATCH /tailor/resumes/{id}              — edit a draft resume payload.
POST  /tailor/resumes/{id}/approve      — approve (lock) a resume.
POST  /tailor/resumes/{id}/unapprove    — reopen an approved resume for editing.
GET   /tailor/resumes/{id}              — one record (either type; look up by id).
GET   /tailor/resumes/{id}/download     — serves the `.docx` bytes.

All 422 responses carry the LintFailureResponse shape.
"""

import io
import re
import zipfile
from typing import Any, cast

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import Response
from supabase import Client

from app.dependencies import (
    get_current_user_id_optional,
    get_llm_client,
    get_supabase,
    verify_api_key_or_jwt,
)
from app.models.batch import BatchJob, BatchRequest, BatchResponse
from app.models.tailor import (
    BulkExportRequest,
    CoverLetterRequest,
    GapGateFailureResponse,
    ResumeCheckpointRequest,
    ResumeEditRequest,
    TailoredResumeRecord,
    TailorLintFailureResponse,
    TailorRequest,
    TailorResponse,
)
from app.services.ats_lint import lint_markdown
from app.services.batch import create_batch, get_batch, process_batch
from app.services.docx.pandoc_render import (
    PandocNotInstalled,
    PandocRenderError,
    md_payload_hash,
    md_to_docx,
)
from app.services.experience import gap_tracker, optimized, preferences
from app.services.llm.client import LLMClient
from app.services.tailor import (
    CoverLetterPipelineLintFailure,
    CoverLetterPipelineSuccess,
    PipelineLintFailure,
    PipelineSuccess,
    persistence,
    run_cover_letter_pipeline,
    run_tailor_pipeline,
    versions,
)
from app.services.tailor.contact import resolve_contact
from app.services.tailor.reuse import (
    clone_resume_for_job,
    extract_profile_keywords,
    find_reusable_resume,
)

router = APIRouter(
    prefix="/tailor",
    tags=["tailor"],
    dependencies=[Depends(verify_api_key_or_jwt)],
)

@router.post(
    "/resume",
    responses={422: {"model": TailorLintFailureResponse | GapGateFailureResponse}},
)
async def create_tailored_resume(
    body: TailorRequest,
    supabase: Client = Depends(get_supabase),
    llm: LLMClient = Depends(get_llm_client),
    user_id: str | None = Depends(get_current_user_id_optional),
) -> TailorResponse:
    current_optimized = optimized.get_latest(supabase, user_id=user_id)
    if current_optimized is None:
        raise HTTPException(
            status_code=404,
            detail="no optimized doc — derive one via POST /experience/derive first",
        )

    gate = gap_tracker.can_generate(current_optimized.payload)
    if not gate.ok:
        health = gap_tracker.gap_health(current_optimized.payload)
        raise HTTPException(
            status_code=422,
            detail={
                "ok": False,
                "code": "gap_gate",
                "reason": gate.reason,
                "message": gate.message,
                "gap_pct": health.gap_pct,
                "tier": health.tier,
            },
        )

    # Reuse check (#504): skip pipeline if a similar resume exists in the target
    if not body.force_fresh and body.job_posting_id:
        jp_resp = (
            supabase.table("jobs")
            .select("target_id")
            .eq("id", body.job_posting_id)
            .execute()
        )
        if jp_resp.data:
            target_id = cast(dict[str, Any], jp_resp.data[0]).get("target_id")
            if target_id:
                target_resp = (
                    supabase.table("targets")
                    .select("scoring_profile")
                    .eq("id", target_id)
                    .execute()
                )
                if target_resp.data:
                    from app.models.targets import ScoringProfile

                    target_row = cast(dict[str, Any], target_resp.data[0])
                    profile = ScoringProfile.model_validate(
                        target_row["scoring_profile"]
                    )
                    keywords = extract_profile_keywords(profile)
                    if keywords:
                        reusable = find_reusable_resume(
                            supabase,
                            target_id=target_id,
                            job_description=body.job_description,
                            profile_keywords=keywords,
                        )
                        if reusable is not None:
                            cloned = clone_resume_for_job(
                                supabase,
                                source=reusable,
                                job_posting_id=body.job_posting_id,
                                job_description=body.job_description,
                                user_id=user_id,
                            )
                            persistence.mark_job_resume_draft(
                                supabase, body.job_posting_id
                            )
                            return TailorResponse(
                                record=cloned,
                                lint_warnings=[],
                            )

    prefs_row = preferences.get(supabase, user_id=user_id)
    prefs_payload = prefs_row.payload if prefs_row else None
    contact = await resolve_contact(supabase, body.contact)

    result = await run_tailor_pipeline(
        supabase,
        llm,
        user_id=user_id,
        optimized=current_optimized,
        job_description=body.job_description,
        contact=contact,
        preferences=prefs_payload,
        critique=body.critique,
        resume_type=body.resume_type or "generic",
        page_budget=body.page_budget,
        job_posting_id=body.job_posting_id,
        target_label=body.target_label,
    )

    if isinstance(result, PipelineLintFailure):
        raise HTTPException(
            status_code=422,
            detail={
                "ok": False,
                "violations": [v.model_dump() for v in result.lint.violations],
            },
        )

    if not isinstance(result, PipelineSuccess):
        raise HTTPException(status_code=500, detail="Unexpected pipeline result")
    if body.job_posting_id:
        persistence.mark_job_resume_draft(supabase, body.job_posting_id)
    return TailorResponse(
        record=result.record,
        lint_warnings=result.lint.warnings,
    )


@router.post(
    "/cover-letter",
    responses={422: {"model": TailorLintFailureResponse | GapGateFailureResponse}},
)
async def create_tailored_cover_letter(
    body: CoverLetterRequest,
    supabase: Client = Depends(get_supabase),
    llm: LLMClient = Depends(get_llm_client),
    user_id: str | None = Depends(get_current_user_id_optional),
) -> TailorResponse:
    current_optimized = optimized.get_latest(supabase, user_id=user_id)
    if current_optimized is None:
        raise HTTPException(
            status_code=404,
            detail="no optimized doc — derive one via POST /experience/derive first",
        )

    gate = gap_tracker.can_generate(current_optimized.payload)
    if not gate.ok:
        health = gap_tracker.gap_health(current_optimized.payload)
        raise HTTPException(
            status_code=422,
            detail={
                "ok": False,
                "code": "gap_gate",
                "reason": gate.reason,
                "message": gate.message,
                "gap_pct": health.gap_pct,
                "tier": health.tier,
            },
        )

    prefs_row = preferences.get(supabase, user_id=user_id)
    prefs_payload = prefs_row.payload if prefs_row else None
    contact = await resolve_contact(supabase, body.contact)

    result = await run_cover_letter_pipeline(
        supabase,
        llm,
        user_id=user_id,
        optimized=current_optimized,
        job_description=body.job_description,
        company_name=body.company_name,
        contact=contact,
        role_title=body.role_title,
        preferences=prefs_payload,
        critique=body.critique,
        job_posting_id=body.job_posting_id,
        target_label=body.target_label,
    )

    if isinstance(result, CoverLetterPipelineLintFailure):
        raise HTTPException(
            status_code=422,
            detail={
                "ok": False,
                "violations": [v.model_dump() for v in result.lint.violations],
            },
        )

    if not isinstance(result, CoverLetterPipelineSuccess):
        raise HTTPException(status_code=500, detail="Unexpected pipeline result")
    return TailorResponse(
        record=result.record,
        lint_warnings=result.lint.warnings,
    )


@router.get("/resumes")
async def list_documents(
    limit: int = 50,
    supabase: Client = Depends(get_supabase),
    user_id: str | None = Depends(get_current_user_id_optional),
) -> dict[str, list[TailoredResumeRecord]]:
    rows = persistence.list_recent(
        supabase,
        user_id=user_id,
        limit=max(1, min(limit, 200)),
        document_type="resume",
    )
    return {"resumes": rows}


@router.get("/cover-letters")
async def list_tailored_cover_letters(
    limit: int = 50,
    supabase: Client = Depends(get_supabase),
    user_id: str | None = Depends(get_current_user_id_optional),
) -> dict[str, list[TailoredResumeRecord]]:
    rows = persistence.list_recent(
        supabase,
        user_id=user_id,
        limit=max(1, min(limit, 200)),
        document_type="cover_letter",
    )
    return {"cover_letters": rows}


# ---- Resume lifecycle (#505) -------------------------------------------------


@router.get("/resumes/by-job/{job_posting_id}")
async def get_resume_by_job(
    job_posting_id: str,
    supabase: Client = Depends(get_supabase),
) -> TailoredResumeRecord:
    """Most recent resume for a given job posting."""
    row = persistence.get_by_job(supabase, job_posting_id)
    if row is None:
        raise HTTPException(status_code=404, detail="no resume found for this job posting")
    return row


@router.get("/cover-letters/by-job/{job_posting_id}")
async def get_cover_letter_by_job(
    job_posting_id: str,
    supabase: Client = Depends(get_supabase),
) -> TailoredResumeRecord:
    """Most recent cover letter for a given job posting."""
    row = persistence.get_by_job(supabase, job_posting_id, document_type="cover_letter")
    if row is None:
        raise HTTPException(status_code=404, detail="no cover letter found for this job posting")
    return row


@router.post("/resumes/export-zip")
async def export_resumes_zip(
    body: BulkExportRequest,
    supabase: Client = Depends(get_supabase),
) -> Response:
    """Download approved resumes as a single .zip archive."""
    records: list[TailoredResumeRecord] = []
    unapproved: list[str] = []
    for rid in body.resume_ids:
        row = persistence.get(supabase, rid)
        if row is None:
            raise HTTPException(status_code=404, detail=f"resume not found: {rid}")
        if row.approved_at is None:
            unapproved.append(rid)
        records.append(row)

    if unapproved:
        raise HTTPException(
            status_code=400,
            detail=f"resumes not yet approved: {', '.join(unapproved)}",
        )

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for rec in records:
            if not rec.storage_path:
                continue
            docx_bytes = persistence.download_docx(supabase, rec.storage_path)
            resume = rec.as_resume()
            # Build a descriptive filename from the first experience entry
            company = "unknown"
            title = "resume"
            if resume.experience:
                company = resume.experience[0].company
                title = resume.experience[0].title
            safe = re.sub(r"[^\w\s-]", "", f"{company}_{title}")
            safe = re.sub(r"\s+", "_", safe).strip("_")[:80]
            zf.writestr(f"{safe}.docx", docx_bytes)

    buf.seek(0)
    return Response(
        content=buf.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": 'attachment; filename="resumes.zip"'},
    )


@router.patch("/resumes/{resume_id}")
async def edit_tailored_resume(
    resume_id: str,
    body: ResumeEditRequest,
    supabase: Client = Depends(get_supabase),
) -> TailorResponse:
    """Edit a draft resume's markdown. Rejected if already approved.

    The .docx isn't re-rendered eagerly — saving is cheap and the
    download endpoint detects a stale hash to re-render lazily.
    """
    row = persistence.get(supabase, resume_id)
    if row is None:
        raise HTTPException(status_code=404, detail="tailored document not found")
    if row.approved_at is not None:
        raise HTTPException(status_code=409, detail="document already approved — cannot edit")

    lint_result = lint_markdown(body.markdown, document_type=row.document_type)
    if lint_result.errors:
        raise HTTPException(
            status_code=422,
            detail={
                "ok": False,
                "violations": [v.model_dump() for v in lint_result.violations],
            },
        )

    record = persistence.update_payload_md(supabase, resume_id, body.markdown)
    return TailorResponse(record=record, lint_warnings=lint_result.warnings)


@router.post("/resumes/{resume_id}/checkpoint")
async def checkpoint_tailored_resume(
    resume_id: str,
    body: ResumeCheckpointRequest | None = None,
    supabase: Client = Depends(get_supabase),
) -> dict[str, Any]:
    """Snapshot a draft resume's current markdown into version history.

    Two callers:
    - `navigator.sendBeacon` on pagehide, with `markdown` in the body, so
      a debounced autosave that hasn't yet flushed still lands in
      history before the page goes away.
    - Pre-approve / pre-readapt explicit checkpoints, with no body.

    Idempotent via dedup: if the latest snapshot already matches, no
    new row is written.
    """
    row = persistence.get(supabase, resume_id)
    if row is None:
        raise HTTPException(status_code=404, detail="tailored document not found")
    if row.approved_at is not None:
        # Approved documents are locked — nothing new to snapshot.
        return {"recorded": False, "reason": "approved"}

    if body and body.markdown:
        lint_result = lint_markdown(body.markdown, document_type=row.document_type)
        if lint_result.errors:
            raise HTTPException(
                status_code=422,
                detail={
                    "ok": False,
                    "violations": [v.model_dump() for v in lint_result.violations],
                },
            )
        persistence.update_payload_md(supabase, resume_id, body.markdown)

    recorded = versions.checkpoint(supabase, resume_id)
    return {"recorded": recorded}


@router.post("/resumes/{resume_id}/approve")
async def approve_tailored_resume(
    resume_id: str,
    supabase: Client = Depends(get_supabase),
) -> TailoredResumeRecord:
    """Approve (lock) a tailored resume or cover letter. Idempotent if already approved."""
    row = persistence.get(supabase, resume_id)
    if row is None:
        raise HTTPException(status_code=404, detail="tailored document not found")

    # Idempotent: if already approved, just return it
    if row.approved_at is not None:
        return row

    record = persistence.approve(supabase, resume_id)

    # Resume approval also advances the linked job posting to resume_ready;
    # cover letters don't drive job status.
    if row.document_type == "resume" and row.job_posting_id:
        supabase.table("jobs").update(
            {"status": "resume_ready"}
        ).eq("id", row.job_posting_id).execute()

    return record


@router.post("/resumes/{resume_id}/unapprove")
async def unapprove_tailored_resume(
    resume_id: str,
    supabase: Client = Depends(get_supabase),
) -> TailoredResumeRecord:
    """Reopen an approved resume or cover letter for editing. Idempotent if already unlocked."""
    row = persistence.get(supabase, resume_id)
    if row is None:
        raise HTTPException(status_code=404, detail="tailored document not found")

    if row.approved_at is None:
        return row

    record = persistence.unapprove(supabase, resume_id)

    # Mirror the approve side: resume unlock walks the linked job back to
    # resume_draft so the lifecycle stays in sync.
    if row.document_type == "resume" and row.job_posting_id:
        supabase.table("jobs").update(
            {"status": "resume_draft"}
        ).eq("id", row.job_posting_id).execute()

    return record


# ---- Single resume lookup + download ----------------------------------------


@router.get("/resumes/{resume_id}")
async def get_tailored_resume(
    resume_id: str,
    supabase: Client = Depends(get_supabase),
) -> TailoredResumeRecord:
    row = persistence.get(supabase, resume_id)
    if row is None:
        raise HTTPException(status_code=404, detail="tailored resume not found")
    return row


@router.get("/resumes/{resume_id}/versions")
async def list_resume_versions(
    resume_id: str,
    supabase: Client = Depends(get_supabase),
) -> dict[str, Any]:
    """Return up to FREE_TIER_VERSION_CAP recent payload snapshots (F3-H)."""
    row = persistence.get(supabase, resume_id)
    if row is None:
        raise HTTPException(status_code=404, detail="tailored resume not found")
    history = versions.list_for_resume(supabase, resume_id)
    return {
        "versions": [v.model_dump(mode="json") for v in history],
        "cap": versions.FREE_TIER_VERSION_CAP,
    }


@router.get("/resumes/{resume_id}/download")
async def download_tailored_resume(
    resume_id: str,
    supabase: Client = Depends(get_supabase),
) -> Response:
    row = persistence.get(supabase, resume_id)
    if row is None:
        raise HTTPException(status_code=404, detail="tailored resume not found")

    expected_hash = md_payload_hash(row.payload_md) if row.payload_md else None
    cache_fresh = (
        row.storage_path is not None
        and expected_hash is not None
        and row.docx_payload_md_hash == expected_hash
    )

    if not cache_fresh:
        if not row.payload_md:
            if not row.storage_path:
                raise HTTPException(
                    status_code=404, detail="no .docx persisted for this resume"
                )
            # Legacy row with cached docx but no markdown — serve cached bytes.
            try:
                data = persistence.download_docx(supabase, row.storage_path)
            except Exception as exc:
                raise HTTPException(
                    status_code=502, detail=f"storage fetch failed: {exc}"
                ) from exc
            filename = f"{row.id}.docx"
            return Response(
                content=data,
                media_type=persistence.DOCX_CONTENT_TYPE,
                headers={"Content-Disposition": f'attachment; filename="{filename}"'},
            )

        try:
            data = md_to_docx(row.payload_md)
        except PandocNotInstalled as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc
        except PandocRenderError as exc:
            raise HTTPException(
                status_code=500, detail=f"docx render failed: {exc}"
            ) from exc

        try:
            storage_path = persistence.upload_docx(
                supabase,
                user_id=row.user_id,
                resume_id=resume_id,
                docx_bytes=data,
            )
            persistence.mark_docx_rendered(
                supabase,
                resume_id,
                storage_path=storage_path,
                payload_md_hash=expected_hash or md_payload_hash(row.payload_md),
            )
        except Exception:
            # Fall through and serve the freshly-rendered bytes regardless;
            # next download will retry the cache write.
            pass
    else:
        try:
            data = persistence.download_docx(supabase, row.storage_path)  # type: ignore[arg-type]
        except Exception as exc:
            raise HTTPException(
                status_code=502, detail=f"storage fetch failed: {exc}"
            ) from exc

    filename = f"{row.id}.docx"
    return Response(
        content=data,
        media_type=persistence.DOCX_CONTENT_TYPE,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ---- Batch resume generation (#503) ----------------------------------------


@router.post("/batch")
async def create_batch_resumes(
    body: BatchRequest,
    background_tasks: BackgroundTasks,
    supabase: Client = Depends(get_supabase),
    llm: LLMClient = Depends(get_llm_client),
    user_id: str | None = Depends(get_current_user_id_optional),
) -> BatchResponse:
    """Kick off batch resume generation for multiple job postings.

    Returns immediately with a batch_id. Poll GET /tailor/batch/{id}
    for progress.
    """
    current_optimized = optimized.get_latest(supabase, user_id=user_id)
    if current_optimized is None:
        raise HTTPException(
            status_code=404,
            detail="no optimized doc — derive one via POST /experience/derive first",
        )

    # Verify all job posting IDs exist and fetch their descriptions + target_id
    warnings: list[str] = []
    postings: list[dict[str, Any]] = []
    for jid in body.job_posting_ids:
        resp = (
            supabase.table("jobs")
            .select("id, title, description_html, target_id")
            .eq("id", jid)
            .execute()
        )
        if not resp.data:
            raise HTTPException(status_code=404, detail=f"job posting not found: {jid}")
        row = cast(dict[str, Any], resp.data[0])
        if not row.get("description_html"):
            warnings.append(f"no_description:{jid}")
        postings.append(row)

    # Derive common target_id from first posting (all batch jobs share a target)
    target_id: str | None = postings[0].get("target_id") if postings else None

    prefs_row = preferences.get(supabase, user_id=user_id)
    prefs_payload = prefs_row.payload if prefs_row else None
    contact = await resolve_contact(supabase, body.contact)

    batch = create_batch(
        supabase,
        user_id=user_id,
        job_posting_ids=body.job_posting_ids,
    )

    background_tasks.add_task(
        process_batch,
        supabase,
        llm,
        batch_id=batch.id,
        user_id=user_id,
        optimized=current_optimized,
        jobs=postings,
        contact=contact,
        preferences=prefs_payload,
        resume_type=body.resume_type or "generic",
        page_budget=body.page_budget,
        force_fresh=body.force_fresh,
        target_id=target_id,
    )

    return BatchResponse(
        batch_id=batch.id,
        total=batch.total,
        status=batch.status,
        warnings=warnings,
    )


@router.get("/batch/{batch_id}")
async def get_batch_status(
    batch_id: str,
    supabase: Client = Depends(get_supabase),
) -> BatchJob:
    """Poll batch processing progress."""
    batch = get_batch(supabase, batch_id)
    if batch is None:
        raise HTTPException(status_code=404, detail="batch not found")
    return batch
