"""Tailor router (#185 P3d).

POST /tailor/resume — runs the full pipeline (synthesize -> render ->
lint -> persist -> upload). Returns the record on success; 422 with
violations on lint failure.
GET /tailor/resumes — recent tailorings for the user.
GET /tailor/resumes/{id} — one record.
GET /tailor/resumes/{id}/download — serves the `.docx` bytes.
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from supabase import Client

from app.dependencies import (
    get_llm_client,
    get_supabase,
    verify_api_key_or_session,
)
from app.models.tailor import (
    TailoredResumeRecord,
    TailorLintFailureResponse,
    TailorRequest,
    TailorResponse,
)
from app.services.experience import optimized, preferences
from app.services.llm.client import LLMClient
from app.services.tailor import (
    PipelineLintFailure,
    PipelineSuccess,
    persistence,
    run_tailor_pipeline,
)

router = APIRouter(
    prefix="/tailor",
    tags=["tailor"],
    dependencies=[Depends(verify_api_key_or_session)],
)


@router.post("/resume", responses={422: {"model": TailorLintFailureResponse}})
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


@router.get("/resumes")
async def list_tailored_resumes(
    limit: int = 50,
    supabase: Client = Depends(get_supabase),
) -> dict[str, list[TailoredResumeRecord]]:
    rows = persistence.list_recent(supabase, user_id=None, limit=max(1, min(limit, 200)))
    return {"resumes": rows}


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
