"""Experience router.

CRUD over prose docs, optimized docs, conversation turns, and preferences.
Creating a new optimized doc also embeds + writes its chunks.
POST /experience/derive runs the end-to-end loop: prose -> LLM -> optimized
doc -> chunks, all cost-logged.
"""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile
from supabase import Client

from app.dependencies import (
    get_embeddings_client,
    get_llm_client,
    get_supabase,
    verify_api_key_or_session,
)
from app.models.conversation import (
    ProbeResult,
    ResetResult,
    TurnRequest,
    TurnResult,
)
from app.models.experience import (
    Annotation,
    AnnotationCreate,
    ConversationType,
    OptimizedDoc,
    OptimizedDocUpsert,
    Preferences,
    PreferencesUpsert,
    ProseDoc,
    ProseDocCreate,
    ResumeUploadResponse,
    TurnAppend,
)
from app.models.conversation import GapHealthResult
from app.models.experience import OptimizedPayload
from app.services.conversation import orchestrator
from app.services.embeddings.client import EmbeddingsClient
from app.services.experience import (
    annotations,
    chunks,
    derive,
    gap_tracker,
    optimized,
    preferences,
    prose,
    turns,
)
from app.services.ingest import merge_into_prose, parse_resume
from app.services.ingest.parse import ParseError
from app.services.ingest.storage import upload_file
from app.services.llm import cost_log
from app.services.llm.client import LLMClient

router = APIRouter(
    prefix="/experience",
    tags=["experience"],
    dependencies=[Depends(verify_api_key_or_session)],
)


# ---- Prose doc ------------------------------------------------------------


@router.get("/prose")
async def get_prose(
    supabase: Client = Depends(get_supabase),
) -> ProseDoc | dict[str, None]:
    doc = prose.get_latest(supabase, user_id=None)
    if doc is None:
        return {"prose": None}
    return doc


@router.post("/prose")
async def create_prose(
    body: ProseDocCreate,
    supabase: Client = Depends(get_supabase),
) -> ProseDoc:
    return prose.create_version(supabase, user_id=None, content=body.content)


# ---- Resume upload --------------------------------------------------------


@router.post("/upload-resume")
async def upload_resume(
    file: UploadFile,
    auto_derive: bool = Query(default=False),
    supabase: Client = Depends(get_supabase),
    llm: LLMClient = Depends(get_llm_client),
    embeddings: EmbeddingsClient = Depends(get_embeddings_client),
) -> ResumeUploadResponse:
    """Upload a resume file (PDF/DOCX), extract text, merge into prose doc."""
    content_type = file.content_type or ""
    filename = file.filename or "unknown"

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=422, detail="Empty file")

    try:
        parsed = parse_resume(file_bytes, filename, content_type)
    except ValueError as exc:
        if "too large" in str(exc).lower():
            raise HTTPException(status_code=413, detail=str(exc))
        raise HTTPException(status_code=415, detail=str(exc))
    except ParseError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    if not parsed.text.strip():
        raise HTTPException(
            status_code=422, detail="No text could be extracted from file"
        )

    warnings = list(parsed.warnings)

    # Store original file in Supabase Storage
    import uuid

    upload_id = str(uuid.uuid4())
    file_ext = parsed.file_type
    try:
        storage_path = upload_file(
            supabase,
            user_id=None,
            upload_id=upload_id,
            file_bytes=file_bytes,
            file_ext=file_ext,
            content_type=content_type,
        )
    except Exception:
        warnings.append("storage_upload_failed")
        storage_path = ""

    # Merge into prose doc
    existing = prose.get_latest(supabase, user_id=None)
    merged = merge_into_prose(
        existing.content if existing else None,
        parsed,
    )
    prose_doc = prose.create_version(supabase, user_id=None, content=merged)

    # Track the upload
    upload_row: dict[str, Any] = {
        "id": upload_id,
        "user_id": None,
        "filename": filename,
        "file_type": parsed.file_type,
        "storage_path": storage_path,
        "extracted_text": parsed.text,
        "prose_doc_id": prose_doc.id,
        "page_count": parsed.page_count,
        "file_size_bytes": len(file_bytes),
        "warnings": warnings,
    }
    supabase.table("resume_uploads").insert(upload_row).execute()

    # Optional: auto-derive
    optimized_doc_id: str | None = None
    if auto_derive:
        payload, result = await derive.derive_from_prose(
            llm, prose_text=prose_doc.content
        )
        cost_log.record(
            supabase,
            user_id=None,
            purpose=derive.DEFAULT_PURPOSE,
            result=result,
            metadata={"prose_doc_id": prose_doc.id, "prose_version": prose_doc.version},
        )

        # Carry forward annotations from previous optimized doc (#499)
        previous_opt = optimized.get_latest(supabase, user_id=None)
        if previous_opt and previous_opt.payload.annotations:
            valid = annotations.validate_annotation_refs(
                previous_opt.payload.annotations, payload
            )
            if valid:
                payload = payload.model_copy(update={"annotations": valid})

        doc = optimized.create_version(
            supabase,
            user_id=None,
            payload=payload,
            prose_doc_id=prose_doc.id,
            source="llm",
        )
        await chunks.upsert_for_optimized(supabase, embeddings, doc, user_id=None)
        optimized_doc_id = doc.id

    return ResumeUploadResponse(
        success=True,
        prose_doc_id=prose_doc.id,
        prose_version=prose_doc.version,
        upload_id=upload_id,
        extracted_chars=len(parsed.text),
        filename=filename,
        warnings=warnings,
        optimized_doc_id=optimized_doc_id,
    )


# ---- Optimized doc --------------------------------------------------------


@router.get("/optimized")
async def get_optimized(
    supabase: Client = Depends(get_supabase),
) -> OptimizedDoc | dict[str, None]:
    doc = optimized.get_latest(supabase, user_id=None)
    if doc is None:
        return {"optimized": None}
    return doc


@router.post("/optimized")
async def create_optimized(
    body: OptimizedDocUpsert,
    supabase: Client = Depends(get_supabase),
    embeddings: EmbeddingsClient = Depends(get_embeddings_client),
) -> OptimizedDoc:
    doc = optimized.create_version(
        supabase,
        user_id=None,
        payload=body.payload,
        prose_doc_id=body.prose_doc_id,
        source=body.source,
        markdown_view=body.markdown_view,
    )
    await chunks.upsert_for_optimized(
        supabase,
        embeddings,
        doc,
        user_id=None,
    )
    return doc


@router.post("/derive")
async def derive_optimized(
    supabase: Client = Depends(get_supabase),
    llm: LLMClient = Depends(get_llm_client),
    embeddings: EmbeddingsClient = Depends(get_embeddings_client),
) -> OptimizedDoc:
    """Read the latest prose doc, derive an OptimizedPayload via LLM,
    persist it as a new optimized version, embed its chunks, and log cost.
    """
    prose_doc = prose.get_latest(supabase, user_id=None)
    if prose_doc is None:
        raise HTTPException(status_code=404, detail="no prose doc to derive from")

    payload, result = await derive.derive_from_prose(
        llm,
        prose_text=prose_doc.content,
    )
    cost_log.record(
        supabase,
        user_id=None,
        purpose=derive.DEFAULT_PURPOSE,
        result=result,
        metadata={"prose_doc_id": prose_doc.id, "prose_version": prose_doc.version},
    )

    # Carry forward annotations from the previous optimized doc (#499)
    previous = optimized.get_latest(supabase, user_id=None)
    if previous and previous.payload.annotations:
        valid = annotations.validate_annotation_refs(
            previous.payload.annotations, payload
        )
        if valid:
            payload = payload.model_copy(update={"annotations": valid})

    doc = optimized.create_version(
        supabase,
        user_id=None,
        payload=payload,
        prose_doc_id=prose_doc.id,
        source="llm",
    )
    await chunks.upsert_for_optimized(
        supabase,
        embeddings,
        doc,
        user_id=None,
    )
    return doc


# ---- Gap health (#498) ----------------------------------------------------


@router.get("/gap-health")
async def get_gap_health(
    supabase: Client = Depends(get_supabase),
) -> GapHealthResult:
    doc = optimized.get_latest(supabase, user_id=None)
    if doc is None:
        return gap_tracker.gap_health(OptimizedPayload())
    return gap_tracker.gap_health(doc.payload)


# ---- Annotations (#499) ---------------------------------------------------


@router.get("/annotations")
async def list_annotations(
    supabase: Client = Depends(get_supabase),
) -> dict[str, list[Annotation]]:
    return {"annotations": annotations.list_annotations(supabase, user_id=None)}


@router.post("/annotations", status_code=201)
async def add_annotation(
    body: AnnotationCreate,
    supabase: Client = Depends(get_supabase),
) -> OptimizedDoc:
    try:
        return annotations.add_annotation(supabase, user_id=None, body=body)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/annotations/{annotation_id}")
async def delete_annotation(
    annotation_id: str,
    supabase: Client = Depends(get_supabase),
) -> OptimizedDoc:
    try:
        return annotations.remove_annotation(
            supabase, user_id=None, annotation_id=annotation_id
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


# ---- Preferences ----------------------------------------------------------


@router.get("/preferences")
async def get_preferences(
    supabase: Client = Depends(get_supabase),
) -> Preferences | dict[str, None]:
    row = preferences.get(supabase, user_id=None)
    if row is None:
        return {"preferences": None}
    return row


@router.put("/preferences")
async def upsert_preferences(
    body: PreferencesUpsert,
    supabase: Client = Depends(get_supabase),
) -> Preferences:
    return preferences.upsert(supabase, user_id=None, payload=body.payload)


@router.delete("/preferences")
async def reset_preferences(
    supabase: Client = Depends(get_supabase),
) -> dict[str, bool]:
    preferences.reset(supabase, user_id=None)
    return {"success": True}


# ---- Conversation turns --------------------------------------------------


@router.get("/turns")
async def list_turns(
    conversation_type: ConversationType | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=1000),
    supabase: Client = Depends(get_supabase),
) -> dict[str, Any]:
    rows = turns.list_turns(
        supabase,
        user_id=None,
        conversation_type=conversation_type,
        limit=limit,
    )
    return {"turns": [r.model_dump(mode="json") for r in rows]}


@router.post("/turns")
async def append_turn(
    body: TurnAppend,
    supabase: Client = Depends(get_supabase),
) -> dict[str, Any]:
    if body.skipped and body.role != "user":
        raise HTTPException(status_code=400, detail="only user turns can be skipped")
    turn = turns.append(
        supabase,
        user_id=None,
        conversation_type=body.conversation_type,
        role=body.role,
        content=body.content,
        skipped=body.skipped,
        prose_doc_id=body.prose_doc_id,
    )
    return turn.model_dump(mode="json")


# ---- Conversation orchestrator (P2d) -------------------------------------


@router.post("/conversation/turn")
async def conversation_turn(
    body: TurnRequest,
    supabase: Client = Depends(get_supabase),
    llm: LLMClient = Depends(get_llm_client),
) -> TurnResult:
    """Run one orchestrated turn. Persists user + assistant turns,
    appends to prose doc if the LLM determined fresh content was shared.
    """
    return await orchestrator.handle_turn(
        supabase,
        llm,
        user_id=None,
        conversation_type=body.conversation_type,
        user_content=body.content,
        skipped=body.skipped,
    )


@router.post("/conversation/reset")
async def conversation_reset(
    supabase: Client = Depends(get_supabase),
) -> ResetResult:
    """Wipe prose, optimized (chunks cascade), and turns. Preferences are
    preserved — delete them via DELETE /experience/preferences if wanted.
    """
    return orchestrator.reset_content(supabase, user_id=None)


@router.get("/conversation/next-probe")
async def conversation_next_probe(
    supabase: Client = Depends(get_supabase),
    llm: LLMClient = Depends(get_llm_client),
) -> ProbeResult:
    """Top-priority gap phrased as a user-facing question by the LLM."""
    return await orchestrator.next_probe(supabase, llm, user_id=None)
