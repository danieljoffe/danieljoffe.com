"""Tailor router.

POST /tailor/resume           — synthesize + render + lint + persist a resume.
POST /tailor/cover-letter     — same pipeline shape, for cover letters.
GET  /tailor/resumes          — recent resume tailorings.
GET  /tailor/cover-letters    — recent cover-letter tailorings.
GET  /tailor/resumes/{id}     — one record (either type; look up by id).
GET  /tailor/resumes/{id}/download — serves the `.docx` bytes.

All 422 responses carry the LintFailureResponse shape.
"""

from typing import Any, cast

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import Response
from supabase import Client

from app.dependencies import (
    get_llm_client,
    get_supabase,
    verify_api_key_or_session,
)
from app.models.batch import BatchJob, BatchRequest, BatchResponse
from app.models.tailor import (
    CoverLetterRequest,
    GapGateFailureResponse,
    TailoredResumeRecord,
    TailorLintFailureResponse,
    TailorRequest,
    TailorResponse,
)
from app.services.batch import create_batch, get_batch, process_batch
from app.services.experience import optimized, preferences
from app.services.llm.client import LLMClient
from app.services.experience import gap_tracker
from app.services.tailor import (
    CoverLetterPipelineLintFailure,
    CoverLetterPipelineSuccess,
    PipelineLintFailure,
    PipelineSuccess,
    persistence,
    run_cover_letter_pipeline,
    run_tailor_pipeline,
)

router = APIRouter(
    prefix="/tailor",
    tags=["tailor"],
    dependencies=[Depends(verify_api_key_or_session)],
)

@router.post(
    "/resume",
    responses={422: {"model": TailorLintFailureResponse | GapGateFailureResponse}},
)
async def create_tailored_resume(
    body: TailorRequest,
    supabase: Client = Depends(get_supabase),
    llm: LLMClient = Depends(get_llm_client),
) -> TailorResponse:
    current_optimized = optimized.get_latest(supabase, user_id=None)
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

    prefs_row = preferences.get(supabase, user_id=None)
    prefs_payload = prefs_row.payload if prefs_row else None

    result = await run_tailor_pipeline(
        supabase,
        llm,
        user_id=None,
        optimized=current_optimized,
        job_description=body.job_description,
        contact=body.contact,
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

    assert isinstance(result, PipelineSuccess)
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
) -> TailorResponse:
    current_optimized = optimized.get_latest(supabase, user_id=None)
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

    prefs_row = preferences.get(supabase, user_id=None)
    prefs_payload = prefs_row.payload if prefs_row else None

    result = await run_cover_letter_pipeline(
        supabase,
        llm,
        user_id=None,
        optimized=current_optimized,
        job_description=body.job_description,
        company_name=body.company_name,
        contact=body.contact,
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

    assert isinstance(result, CoverLetterPipelineSuccess)
    return TailorResponse(
        record=result.record,
        lint_warnings=result.lint.warnings,
    )


@router.get("/resumes")
async def list_tailored_resumes(
    limit: int = 50,
    supabase: Client = Depends(get_supabase),
) -> dict[str, list[TailoredResumeRecord]]:
    rows = persistence.list_recent(
        supabase,
        user_id=None,
        limit=max(1, min(limit, 200)),
        document_type="resume",
    )
    return {"resumes": rows}


@router.get("/cover-letters")
async def list_tailored_cover_letters(
    limit: int = 50,
    supabase: Client = Depends(get_supabase),
) -> dict[str, list[TailoredResumeRecord]]:
    rows = persistence.list_recent(
        supabase,
        user_id=None,
        limit=max(1, min(limit, 200)),
        document_type="cover_letter",
    )
    return {"cover_letters": rows}


@router.get("/resumes/{resume_id}")
async def get_tailored_resume(
    resume_id: str,
    supabase: Client = Depends(get_supabase),
) -> TailoredResumeRecord:
    row = persistence.get(supabase, resume_id)
    if row is None:
        raise HTTPException(status_code=404, detail="tailored resume not found")
    return row


@router.get("/resumes/{resume_id}/download")
async def download_tailored_resume(
    resume_id: str,
    supabase: Client = Depends(get_supabase),
) -> Response:
    row = persistence.get(supabase, resume_id)
    if row is None:
        raise HTTPException(status_code=404, detail="tailored resume not found")
    if not row.storage_path:
        raise HTTPException(status_code=404, detail="no .docx persisted for this resume")
    try:
        data = persistence.download_docx(supabase, row.storage_path)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"storage fetch failed: {exc}") from exc
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
) -> BatchResponse:
    """Kick off batch resume generation for multiple job postings.

    Returns immediately with a batch_id. Poll GET /tailor/batch/{id}
    for progress.
    """
    current_optimized = optimized.get_latest(supabase, user_id=None)
    if current_optimized is None:
        raise HTTPException(
            status_code=404,
            detail="no optimized doc — derive one via POST /experience/derive first",
        )

    # Verify all job posting IDs exist and fetch their descriptions
    warnings: list[str] = []
    postings: list[dict[str, Any]] = []
    for jid in body.job_posting_ids:
        resp = (
            supabase.table("job_postings")
            .select("id, title, description_html")
            .eq("id", jid)
            .execute()
        )
        if not resp.data:
            raise HTTPException(status_code=404, detail=f"job posting not found: {jid}")
        row = cast(dict[str, Any], resp.data[0])
        if not row.get("description_html"):
            warnings.append(f"no_description:{jid}")
        postings.append(row)

    prefs_row = preferences.get(supabase, user_id=None)
    prefs_payload = prefs_row.payload if prefs_row else None

    batch = create_batch(
        supabase,
        user_id=None,
        job_posting_ids=body.job_posting_ids,
    )

    background_tasks.add_task(
        process_batch,
        supabase,
        llm,
        batch_id=batch.id,
        user_id=None,
        optimized=current_optimized,
        job_postings=postings,
        contact=body.contact,
        preferences=prefs_payload,
        resume_type=body.resume_type or "generic",
        page_budget=body.page_budget,
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
