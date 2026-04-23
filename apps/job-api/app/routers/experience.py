"""Experience router.

CRUD over prose docs, optimized docs, conversation turns, and preferences.
Creating a new optimized doc also embeds + writes its chunks.
POST /experience/derive runs the end-to-end loop: prose -> LLM -> optimized
doc -> chunks, all cost-logged.
"""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
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
    ConversationType,
    OptimizedDoc,
    OptimizedDocUpsert,
    Preferences,
    PreferencesUpsert,
    ProseDoc,
    ProseDocCreate,
    TurnAppend,
)
from app.services.conversation import orchestrator
from app.services.embeddings.client import EmbeddingsClient
from app.services.experience import chunks, derive, optimized, preferences, prose, turns
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
