"""Experience router.

CRUD over prose docs, optimized docs, conversation turns, and preferences.
Creating a new optimized doc also embeds + writes its chunks.
POST /experience/derive runs the end-to-end loop: prose -> LLM -> optimized
doc -> chunks, all cost-logged.
"""

import asyncio
import json
from collections.abc import AsyncIterator
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import ValidationError
from supabase import Client

from app.dependencies import (
    get_current_user_id_optional,
    get_embeddings_client,
    get_llm_client,
    get_supabase,
    verify_api_key_or_jwt,
)
from app.models.conversation import (
    GapHealthResult,
    ProbeResult,
    ResetResult,
    TurnRequest,
    TurnResult,
)
from app.models.experience import (
    ConversationType,
    OptimizedDoc,
    OptimizedDocUpsert,
    OptimizedPayload,
    Preferences,
    PreferencesUpsert,
    ProseConsolidateResponse,
    ProseDoc,
    ProseDocCreate,
    ResumeUploadResponse,
    TurnAppend,
)
from app.models.llm import Message
from app.services.conversation import orchestrator
from app.services.embeddings.client import EmbeddingsClient
from app.services.experience import (
    annotations,
    chunks,
    consolidate,
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
from app.services.llm.client import LLMClient, strip_markdown_fence

router = APIRouter(
    prefix="/experience",
    tags=["experience"],
    dependencies=[Depends(verify_api_key_or_jwt)],
)


# ---- Prose doc ------------------------------------------------------------


@router.get("/prose")
async def get_prose(
    supabase: Client = Depends(get_supabase),
    user_id: str | None = Depends(get_current_user_id_optional),
) -> ProseDoc | dict[str, None]:
    doc = prose.get_latest(supabase, user_id=user_id)
    if doc is None:
        return {"prose": None}
    return doc


@router.post("/prose")
async def create_prose(
    body: ProseDocCreate,
    supabase: Client = Depends(get_supabase),
    user_id: str | None = Depends(get_current_user_id_optional),
) -> ProseDoc:
    return prose.create_version(supabase, user_id=user_id, content=body.content)


@router.post("/prose/consolidate")
async def consolidate_prose(
    supabase: Client = Depends(get_supabase),
    llm: LLMClient = Depends(get_llm_client),
    user_id: str | None = Depends(get_current_user_id_optional),
) -> ProseConsolidateResponse:
    """LLM-dedupe the latest prose doc and persist as a new version.

    Older docs that grew via naive concat-with-divider on each upload often
    contain multiple near-identical resume copies. This pass merges them.
    The result is always a new version — the original stays in history.
    """
    latest = prose.get_latest(supabase, user_id=user_id)
    if latest is None:
        raise HTTPException(status_code=404, detail="no prose doc to consolidate")

    consolidated, result, fallback_reason = await consolidate.consolidate_prose(
        llm, content=latest.content
    )
    if result is not None:
        metadata: dict[str, str | int | float | bool] = {
            "prose_doc_id": latest.id,
            "prose_version": latest.version,
            "chars_before": len(latest.content),
            "chars_after": len(consolidated),
        }
        if fallback_reason is not None:
            metadata["fallback_reason"] = fallback_reason
        cost_log.record(
            supabase,
            user_id=user_id,
            purpose=consolidate.DEFAULT_PURPOSE,
            result=result,
            metadata=metadata,
        )

    no_op = consolidate.is_no_op(before=latest.content, after=consolidated)
    if no_op and consolidated == latest.content:
        # Nothing to persist — either too short to consolidate, the LLM
        # returned the input unchanged, or the safety net rejected the LLM
        # output. Return the existing version as-is, with fallback_reason
        # set when the rejection path was taken.
        return ProseConsolidateResponse(
            prose=latest,
            chars_before=len(latest.content),
            chars_after=len(latest.content),
            no_op=True,
            fallback_reason=fallback_reason,
        )

    new_doc = prose.create_version(supabase, user_id=user_id, content=consolidated)
    return ProseConsolidateResponse(
        prose=new_doc,
        chars_before=len(latest.content),
        chars_after=len(consolidated),
        no_op=no_op,
        fallback_reason=fallback_reason,
    )


# ---- Resume upload --------------------------------------------------------


@router.post("/upload-resume")
async def upload_resume(
    file: UploadFile,
    auto_derive: bool = Query(default=False),
    supabase: Client = Depends(get_supabase),
    llm: LLMClient = Depends(get_llm_client),
    embeddings: EmbeddingsClient = Depends(get_embeddings_client),
    user_id: str | None = Depends(get_current_user_id_optional),
) -> ResumeUploadResponse:
    """Upload a resume file (PDF/DOCX), extract text, merge into prose doc."""
    content_type = file.content_type or ""
    filename = file.filename or "unknown"

    max_upload_bytes = 10 * 1024 * 1024  # 10 MB
    file_bytes = await file.read(max_upload_bytes + 1)
    if not file_bytes:
        raise HTTPException(status_code=422, detail="Empty file")
    if len(file_bytes) > max_upload_bytes:
        raise HTTPException(status_code=413, detail="File exceeds 10 MB limit")

    try:
        parsed = await asyncio.to_thread(parse_resume, file_bytes, filename, content_type)
    except ValueError as exc:
        if "too large" in str(exc).lower():
            raise HTTPException(status_code=413, detail=str(exc)) from None
        raise HTTPException(status_code=415, detail=str(exc)) from None
    except ParseError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from None

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
            user_id=user_id,
            upload_id=upload_id,
            file_bytes=file_bytes,
            file_ext=file_ext,
            content_type=content_type,
        )
    except Exception:
        warnings.append("storage_upload_failed")
        storage_path = ""

    # Merge into prose doc — semantic merge via LLM (#497).
    existing = prose.get_latest(supabase, user_id=user_id)
    merged, merge_result = await merge_into_prose(
        llm,
        existing_content=existing.content if existing else None,
        parsed=parsed,
    )
    prose_doc = prose.create_version(supabase, user_id=user_id, content=merged)
    if merge_result is not None:
        cost_log.record(
            supabase,
            user_id=user_id,
            purpose="experience.ingest_merge",
            result=merge_result,
            metadata={"prose_doc_id": prose_doc.id, "filename": filename},
        )

    # Track the upload
    upload_row: dict[str, Any] = {
        "id": upload_id,
        "user_id": user_id,
        "filename": filename,
        "file_type": parsed.file_type,
        "storage_path": storage_path,
        "extracted_text": parsed.text,
        "prose_doc_id": prose_doc.id,
        "page_count": parsed.page_count,
        "file_size_bytes": len(file_bytes),
        "warnings": warnings,
    }
    supabase.table("uploaded_resumes").insert(upload_row).execute()

    # Optional: auto-derive
    optimized_doc_id: str | None = None
    if auto_derive:
        payload, result = await derive.derive_from_prose(
            llm, prose_text=prose_doc.content
        )
        cost_log.record(
            supabase,
            user_id=user_id,
            purpose=derive.DEFAULT_PURPOSE,
            result=result,
            metadata={"prose_doc_id": prose_doc.id, "prose_version": prose_doc.version},
        )

        # Carry forward annotations from previous doc and merge with any
        # the LLM extracted from inline prose comments this round (#499).
        previous_opt = optimized.get_latest(supabase, user_id=user_id)
        carried = (
            annotations.validate_annotation_refs(
                previous_opt.payload.annotations, payload
            )
            if previous_opt and previous_opt.payload.annotations
            else []
        )
        merged_annotations = annotations.merge_annotations(carried, payload.annotations)
        payload = payload.model_copy(update={"annotations": merged_annotations})

        doc = optimized.create_version(
            supabase,
            user_id=user_id,
            payload=payload,
            prose_doc_id=prose_doc.id,
            source="llm",
        )
        await chunks.upsert_for_optimized(supabase, embeddings, doc, user_id=user_id)
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
def get_optimized(
    supabase: Client = Depends(get_supabase),
    user_id: str | None = Depends(get_current_user_id_optional),
) -> OptimizedDoc | dict[str, None]:
    doc = optimized.get_latest(supabase, user_id=user_id)
    if doc is None:
        return {"optimized": None}
    return doc


@router.post("/optimized")
async def create_optimized(
    body: OptimizedDocUpsert,
    supabase: Client = Depends(get_supabase),
    embeddings: EmbeddingsClient = Depends(get_embeddings_client),
    user_id: str | None = Depends(get_current_user_id_optional),
) -> OptimizedDoc:
    doc = optimized.create_version(
        supabase,
        user_id=user_id,
        payload=body.payload,
        prose_doc_id=body.prose_doc_id,
        source=body.source,
        markdown_view=body.markdown_view,
    )
    await chunks.upsert_for_optimized(
        supabase,
        embeddings,
        doc,
        user_id=user_id,
    )
    return doc


@router.post("/derive")
async def derive_optimized(
    supabase: Client = Depends(get_supabase),
    llm: LLMClient = Depends(get_llm_client),
    embeddings: EmbeddingsClient = Depends(get_embeddings_client),
    user_id: str | None = Depends(get_current_user_id_optional),
) -> OptimizedDoc:
    """Read the latest prose doc, derive an OptimizedPayload via LLM,
    persist it as a new optimized version, embed its chunks, and log cost.

    Short-circuits when the latest LLM-sourced optimized doc already points
    at this prose doc — repeat derives on unchanged prose are a 40s no-op
    otherwise. User-edited optimized docs (source="user_edit") never
    short-circuit; the user has explicitly asked to regenerate.
    """
    prose_doc = prose.get_latest(supabase, user_id=user_id)
    if prose_doc is None:
        raise HTTPException(status_code=404, detail="no prose doc to derive from")

    previous = optimized.get_latest(supabase, user_id=user_id)
    if (
        previous is not None
        and previous.prose_doc_id == prose_doc.id
        and previous.source == "llm"
    ):
        return previous

    payload, result = await derive.derive_from_prose(
        llm,
        prose_text=prose_doc.content,
    )
    cost_log.record(
        supabase,
        user_id=user_id,
        purpose=derive.DEFAULT_PURPOSE,
        result=result,
        metadata={"prose_doc_id": prose_doc.id, "prose_version": prose_doc.version},
    )

    # Carry forward annotations from the previous doc and merge with any
    # the LLM extracted from inline prose comments this round (#499).
    carried = (
        annotations.validate_annotation_refs(
            previous.payload.annotations, payload
        )
        if previous and previous.payload.annotations
        else []
    )
    merged = annotations.merge_annotations(carried, payload.annotations)
    payload = payload.model_copy(update={"annotations": merged})

    doc = optimized.create_version(
        supabase,
        user_id=user_id,
        payload=payload,
        prose_doc_id=prose_doc.id,
        source="llm",
    )
    await chunks.upsert_for_optimized(
        supabase,
        embeddings,
        doc,
        user_id=user_id,
    )
    return doc


def _sse_event(event: str, data: dict[str, Any]) -> bytes:
    """Format a Server-Sent Events frame.

    The blank line that follows ``data:`` terminates the event. ``data`` is
    JSON-encoded as a single line — the SSE spec disallows raw newlines in
    a single ``data:`` field, and ``json.dumps`` defaults to compact output
    so we satisfy that automatically.
    """
    return f"event: {event}\ndata: {json.dumps(data)}\n\n".encode()


@router.post("/derive/stream")
async def derive_optimized_stream(
    supabase: Client = Depends(get_supabase),
    llm: LLMClient = Depends(get_llm_client),
    embeddings: EmbeddingsClient = Depends(get_embeddings_client),
    user_id: str | None = Depends(get_current_user_id_optional),
) -> StreamingResponse:
    """Streaming variant of /derive.

    Emits SSE frames for each LLM text delta so the client can render fields
    progressively (a 40s wall-clock derive becomes "watch the resume appear"
    instead of a 40s spinner). Concludes with a single ``done`` event whose
    payload is the persisted ``OptimizedDoc``. Same skip-when-unchanged
    short-circuit as /derive — when triggered, the response contains a
    single ``done`` event with ``cached: true`` and no deltas.

    Errors that occur after the response stream opens are surfaced via an
    ``error`` SSE event rather than as an HTTP error code, since headers
    have already been sent. Pre-flight errors (missing prose) still come
    back as HTTP 404 before any SSE frame is written.
    """
    prose_doc = prose.get_latest(supabase, user_id=user_id)
    if prose_doc is None:
        raise HTTPException(status_code=404, detail="no prose doc to derive from")

    previous = optimized.get_latest(supabase, user_id=user_id)

    async def generate() -> AsyncIterator[bytes]:
        if (
            previous is not None
            and previous.prose_doc_id == prose_doc.id
            and previous.source == "llm"
        ):
            yield _sse_event(
                "done",
                {"doc": previous.model_dump(mode="json"), "cached": True},
            )
            return

        buffered_text: list[str] = []
        result = None
        async for event in llm.stream(
            model=derive.DEFAULT_MODEL,
            system=derive.SYSTEM_PROMPT,
            messages=[Message(role="user", content=prose_doc.content)],
            purpose=derive.DEFAULT_PURPOSE,
            max_tokens=derive.DEFAULT_MAX_TOKENS,
            cache_system=True,
        ):
            if event.type == "delta":
                buffered_text.append(event.text)
                yield _sse_event("delta", {"text": event.text})
            else:
                result = event.result

        if result is None:
            yield _sse_event(
                "error", {"detail": "stream ended without a final event"}
            )
            return

        try:
            payload = OptimizedPayload.model_validate_json(
                strip_markdown_fence(result.content)
            )
        except ValidationError as exc:
            yield _sse_event("error", {"detail": f"invalid payload: {exc}"})
            return

        cost_log.record(
            supabase,
            user_id=user_id,
            purpose=derive.DEFAULT_PURPOSE,
            result=result,
            metadata={
                "prose_doc_id": prose_doc.id,
                "prose_version": prose_doc.version,
                "streamed": True,
            },
        )

        carried = (
            annotations.validate_annotation_refs(
                previous.payload.annotations, payload
            )
            if previous and previous.payload.annotations
            else []
        )
        merged = annotations.merge_annotations(carried, payload.annotations)
        payload = payload.model_copy(update={"annotations": merged})

        doc = optimized.create_version(
            supabase,
            user_id=user_id,
            payload=payload,
            prose_doc_id=prose_doc.id,
            source="llm",
        )
        await chunks.upsert_for_optimized(
            supabase,
            embeddings,
            doc,
            user_id=user_id,
        )

        yield _sse_event(
            "done",
            {"doc": doc.model_dump(mode="json"), "cached": False},
        )

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",  # disable nginx response buffering
        },
    )


# ---- Gap health (#498) ----------------------------------------------------


@router.get("/gap-health")
def get_gap_health(
    supabase: Client = Depends(get_supabase),
    user_id: str | None = Depends(get_current_user_id_optional),
) -> GapHealthResult:
    doc = optimized.get_latest(supabase, user_id=user_id)
    if doc is None:
        return gap_tracker.gap_health(OptimizedPayload())
    return gap_tracker.gap_health(doc.payload)


# ---- Preferences ----------------------------------------------------------


@router.get("/preferences")
async def get_preferences(
    supabase: Client = Depends(get_supabase),
    user_id: str | None = Depends(get_current_user_id_optional),
) -> Preferences | dict[str, None]:
    row = preferences.get(supabase, user_id=user_id)
    if row is None:
        return {"preferences": None}
    return row


@router.put("/preferences")
async def upsert_preferences(
    body: PreferencesUpsert,
    supabase: Client = Depends(get_supabase),
    user_id: str | None = Depends(get_current_user_id_optional),
) -> Preferences:
    return preferences.upsert(supabase, user_id=user_id, payload=body.payload)


@router.delete("/preferences")
async def reset_preferences(
    supabase: Client = Depends(get_supabase),
    user_id: str | None = Depends(get_current_user_id_optional),
) -> dict[str, bool]:
    preferences.reset(supabase, user_id=user_id)
    return {"success": True}


# ---- Conversation turns --------------------------------------------------


@router.get("/turns")
async def list_turns(
    conversation_type: ConversationType | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=1000),
    supabase: Client = Depends(get_supabase),
    user_id: str | None = Depends(get_current_user_id_optional),
) -> dict[str, Any]:
    rows = turns.list_turns(
        supabase,
        user_id=user_id,
        conversation_type=conversation_type,
        limit=limit,
    )
    return {"turns": [r.model_dump(mode="json") for r in rows]}


@router.post("/turns")
async def append_turn(
    body: TurnAppend,
    supabase: Client = Depends(get_supabase),
    user_id: str | None = Depends(get_current_user_id_optional),
) -> dict[str, Any]:
    if body.skipped and body.role != "user":
        raise HTTPException(status_code=400, detail="only user turns can be skipped")
    turn = turns.append(
        supabase,
        user_id=user_id,
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
    user_id: str | None = Depends(get_current_user_id_optional),
) -> TurnResult:
    """Run one orchestrated turn. Persists user + assistant turns,
    appends to prose doc if the LLM determined fresh content was shared.
    """
    return await orchestrator.handle_turn(
        supabase,
        llm,
        user_id=user_id,
        conversation_type=body.conversation_type,
        user_content=body.content,
        skipped=body.skipped,
    )


@router.post("/conversation/reset")
async def conversation_reset(
    supabase: Client = Depends(get_supabase),
    user_id: str | None = Depends(get_current_user_id_optional),
) -> ResetResult:
    """Wipe prose, optimized (chunks cascade), and turns. Preferences are
    preserved — delete them via DELETE /experience/preferences if wanted.
    """
    return orchestrator.reset_content(supabase, user_id=user_id)


@router.get("/conversation/next-probe")
async def conversation_next_probe(
    supabase: Client = Depends(get_supabase),
    llm: LLMClient = Depends(get_llm_client),
    user_id: str | None = Depends(get_current_user_id_optional),
) -> ProbeResult:
    """Top-priority gap phrased as a user-facing question by the LLM."""
    return await orchestrator.next_probe(supabase, llm, user_id=user_id)
