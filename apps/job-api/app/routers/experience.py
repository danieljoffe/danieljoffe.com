"""Experience router (#185 P1).

CRUD over prose docs, optimized docs, conversation turns, and preferences.
No LLM involvement in this phase — that ships in P2. These endpoints exist
so a client (CLI today, dashboard later) can exercise the data layer.
"""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client

from app.dependencies import get_supabase, verify_api_key_or_session
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
from app.services.experience import optimized, preferences, prose, turns

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
) -> OptimizedDoc:
    return optimized.create_version(
        supabase,
        user_id=None,
        payload=body.payload,
        prose_doc_id=body.prose_doc_id,
        source=body.source,
        markdown_view=body.markdown_view,
    )


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
