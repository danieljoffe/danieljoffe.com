"""End-to-end tailor pipeline (#185 P3d).

Glue between the four isolated units:
  tailor_resume (P3a)  -> render_docx (P3b) -> lint_docx (P3c) -> persist

Splits cleanly between "LLM synthesis" (can fail on hallucination
trace-check with ValueError) and "format check" (returns LintResult).
Lint errors short-circuit the pipeline and return without persisting.

The router layer just calls `run_tailor_pipeline(...)` and converts the
result into an HTTP response.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass

from supabase import Client

from app.models.ats_lint import LintResult
from app.models.experience import OptimizedDoc, PreferencesPayload
from app.models.llm import LLMResult
from app.models.tailor import (
    ContactInfo,
    ResumeType,
    TailoredCoverLetter,
    TailoredResume,
    TailoredResumeRecord,
)
from app.services.ats_lint import lint_docx, lint_markdown
from app.services.docx.pandoc_render import md_to_docx
from app.services.experience.annotations import (
    apply_exclusions,
    build_annotations_text,
    resolve_for_target,
)
from app.services.llm import cost_log
from app.services.llm.client import LLMClient
from app.services.tailor import persistence
from app.services.tailor.markdown_render import (
    to_markdown,
    to_markdown_cover_letter,
)
from app.services.tailor.tailor import (
    DEFAULT_COVER_LETTER_PURPOSE,
    DEFAULT_PURPOSE,
    tailor_cover_letter,
    tailor_resume,
)


@dataclass
class PipelineSuccess:
    record: TailoredResumeRecord
    resume: TailoredResume
    warnings: list[str]
    lint: LintResult
    llm_result: LLMResult


@dataclass
class PipelineLintFailure:
    lint: LintResult
    resume: TailoredResume
    warnings: list[str]
    llm_result: LLMResult


PipelineResult = PipelineSuccess | PipelineLintFailure


async def run_tailor_pipeline(
    supabase: Client,
    llm: LLMClient,
    *,
    user_id: str | None,
    optimized: OptimizedDoc,
    job_description: str,
    contact: ContactInfo,
    preferences: PreferencesPayload | None = None,
    critique: str | None = None,
    resume_type: ResumeType = "generic",
    page_budget: int = 2,
    job_posting_id: str | None = None,
    target_label: str | None = None,
) -> PipelineResult:
    """Run the full tailor pipeline end-to-end.

    Returns PipelineSuccess on clean lint, PipelineLintFailure when the
    rendered doc has blocking errors. On lint failure nothing is
    persisted and no `.docx` is uploaded — the caller should surface the
    violations and retry with a critique.
    """
    # Resolve annotations for the target (#499)
    emphasize, exclude, de_emph = resolve_for_target(
        optimized.payload.annotations, target_label
    )
    filtered_payload = apply_exclusions(optimized.payload, exclude)
    annotations_text = build_annotations_text(emphasize, de_emph)

    resume, trace_warnings, llm_result = await tailor_resume(
        llm,
        optimized=filtered_payload,
        job_description=job_description,
        contact=contact,
        resume_type=resume_type,
        preferences_rules=(preferences.rules if preferences else None),
        preferences_avoid=(preferences.avoid if preferences else None),
        preferences_tone_notes=(preferences.tone_notes if preferences else None),
        annotations_text=annotations_text,
        critique=critique,
        page_budget=page_budget,
    )

    cost_log.record(
        supabase,
        user_id=user_id,
        purpose=DEFAULT_PURPOSE,
        result=llm_result,
        metadata={
            "optimized_doc_id": optimized.id,
            "job_posting_id": job_posting_id or "",
        },
    )

    payload_md = to_markdown(resume)
    md_lint = lint_markdown(payload_md, document_type="resume")
    if not md_lint.ok:
        return PipelineLintFailure(
            lint=md_lint,
            resume=resume,
            warnings=trace_warnings,
            llm_result=llm_result,
        )
    # pandoc is a sync subprocess; offload to a worker thread so the event
    # loop keeps serving other requests during the ~hundreds-of-ms render.
    docx_bytes = await asyncio.to_thread(md_to_docx, payload_md)
    lint = lint_docx(docx_bytes)
    if not lint.ok:
        return PipelineLintFailure(
            lint=lint,
            resume=resume,
            warnings=trace_warnings,
            llm_result=llm_result,
        )

    record = persistence.persist(
        supabase,
        user_id=user_id,
        job_posting_id=job_posting_id,
        resume=resume,
        payload_md=payload_md,
        job_description=job_description,
        warnings=trace_warnings,
        llm_result=llm_result,
        storage_path=None,
    )
    try:
        storage_path = persistence.upload_docx(
            supabase,
            user_id=user_id,
            resume_id=record.id,
            docx_bytes=docx_bytes,
        )
    except Exception:
        storage_path = None
    if storage_path:
        supabase.table(persistence.TABLE).update({"storage_path": storage_path}).eq(
            "id", record.id
        ).execute()
        record = record.model_copy(update={"storage_path": storage_path})

    return PipelineSuccess(
        record=record,
        resume=resume,
        warnings=trace_warnings,
        lint=lint,
        llm_result=llm_result,
    )


# ---------------------------------------------------------------------------
# Cover letter pipeline
# ---------------------------------------------------------------------------


@dataclass
class CoverLetterPipelineSuccess:
    record: TailoredResumeRecord
    letter: TailoredCoverLetter
    warnings: list[str]
    lint: LintResult
    llm_result: LLMResult


@dataclass
class CoverLetterPipelineLintFailure:
    lint: LintResult
    letter: TailoredCoverLetter
    warnings: list[str]
    llm_result: LLMResult


CoverLetterPipelineResult = CoverLetterPipelineSuccess | CoverLetterPipelineLintFailure


async def run_cover_letter_pipeline(
    supabase: Client,
    llm: LLMClient,
    *,
    user_id: str | None,
    optimized: OptimizedDoc,
    job_description: str,
    company_name: str,
    contact: ContactInfo,
    role_title: str | None = None,
    preferences: PreferencesPayload | None = None,
    critique: str | None = None,
    job_posting_id: str | None = None,
    target_label: str | None = None,
) -> CoverLetterPipelineResult:
    """Run the full cover-letter pipeline end-to-end.

    Returns CoverLetterPipelineSuccess on clean lint, CoverLetterPipelineLintFailure
    when the rendered doc has blocking errors. On lint failure nothing is
    persisted and no `.docx` is uploaded — the caller should surface the
    violations and retry with a critique.
    """
    # Resolve annotations for the target (#499)
    emphasize, exclude, de_emph = resolve_for_target(
        optimized.payload.annotations, target_label
    )
    filtered_payload = apply_exclusions(optimized.payload, exclude)
    annotations_text = build_annotations_text(emphasize, de_emph)

    letter, trace_warnings, llm_result = await tailor_cover_letter(
        llm,
        optimized=filtered_payload,
        job_description=job_description,
        company_name=company_name,
        contact=contact,
        role_title=role_title,
        preferences_rules=(preferences.rules if preferences else None),
        preferences_avoid=(preferences.avoid if preferences else None),
        preferences_tone_notes=(preferences.tone_notes if preferences else None),
        annotations_text=annotations_text,
        critique=critique,
    )

    cost_log.record(
        supabase,
        user_id=user_id,
        purpose=DEFAULT_COVER_LETTER_PURPOSE,
        result=llm_result,
        metadata={
            "optimized_doc_id": optimized.id,
            "job_posting_id": job_posting_id or "",
            "recipient_company": company_name,
        },
    )

    payload_md = to_markdown_cover_letter(letter)
    md_lint = lint_markdown(payload_md, document_type="cover_letter")
    if not md_lint.ok:
        return CoverLetterPipelineLintFailure(
            lint=md_lint,
            letter=letter,
            warnings=trace_warnings,
            llm_result=llm_result,
        )
    docx_bytes = await asyncio.to_thread(md_to_docx, payload_md)
    lint = lint_docx(docx_bytes, document_type="cover_letter")
    if not lint.ok:
        return CoverLetterPipelineLintFailure(
            lint=lint,
            letter=letter,
            warnings=trace_warnings,
            llm_result=llm_result,
        )

    record = persistence.persist_cover_letter(
        supabase,
        user_id=user_id,
        job_posting_id=job_posting_id,
        letter=letter,
        payload_md=payload_md,
        job_description=job_description,
        warnings=trace_warnings,
        llm_result=llm_result,
        storage_path=None,
    )
    try:
        storage_path = persistence.upload_docx(
            supabase,
            user_id=user_id,
            resume_id=record.id,
            docx_bytes=docx_bytes,
        )
    except Exception:
        storage_path = None
    if storage_path:
        supabase.table(persistence.TABLE).update({"storage_path": storage_path}).eq(
            "id", record.id
        ).execute()
        record = record.model_copy(update={"storage_path": storage_path})

    return CoverLetterPipelineSuccess(
        record=record,
        letter=letter,
        warnings=trace_warnings,
        lint=lint,
        llm_result=llm_result,
    )
