"""Pydantic models for the experience module (#185 P1).

Two-doc content model:
- ProseDoc: user-owned narrative. Append-only from conversation turns.
- OptimizedDoc: LLM-derived structured projection of the prose. User-editable.

Chunks, turns, and preferences support retrieval, chat, and persistent style bias.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

ConversationType = Literal["onboarding", "update"]
TurnRole = Literal["user", "assistant", "system"]
ChunkType = Literal["role", "skill", "outcome", "summary"]
OptimizedDocSource = Literal["llm", "user_edit"]


# ---------------------------------------------------------------------------
# Optimized doc payload shape. The LLM produces this from the prose doc;
# the tailor reads it. Every claim in a generated resume must trace back
# to something in this structure.
# ---------------------------------------------------------------------------

class Outcome(BaseModel):
    description: str
    metric: str | None = None
    value: str | None = None
    role_ref: str | None = None


class Role(BaseModel):
    id: str
    company: str
    title: str
    start: str
    end: str | None = None
    summary: str | None = None
    skills: list[str] = Field(default_factory=list)
    outcome_refs: list[str] = Field(default_factory=list)


class Skill(BaseModel):
    name: str
    evidence_refs: list[str] = Field(default_factory=list)
    years: float | None = None


class OptimizedPayload(BaseModel):
    summary: str | None = None
    roles: list[Role] = Field(default_factory=list)
    skills: list[Skill] = Field(default_factory=list)
    outcomes: list[Outcome] = Field(default_factory=list)


class PreferencesPayload(BaseModel):
    rules: list[str] = Field(default_factory=list)
    avoid: list[str] = Field(default_factory=list)
    tone_notes: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Row models (DB read shapes)
# ---------------------------------------------------------------------------

class ProseDoc(BaseModel):
    id: str
    user_id: str | None
    version: int
    content: str
    created_at: datetime


class OptimizedDoc(BaseModel):
    id: str
    user_id: str | None
    prose_doc_id: str | None
    version: int
    payload: OptimizedPayload
    markdown_view: str | None
    source: OptimizedDocSource
    created_at: datetime


class Chunk(BaseModel):
    id: str
    optimized_doc_id: str
    chunk_type: ChunkType
    chunk_ref: str
    content: str
    metadata: dict[str, str | int | float | bool]
    created_at: datetime


class ConversationTurn(BaseModel):
    id: str
    user_id: str | None
    conversation_type: ConversationType
    turn_index: int
    role: TurnRole
    content: str
    skipped: bool
    prose_doc_id: str | None
    metadata: dict[str, str | int | float | bool]
    created_at: datetime


class Preferences(BaseModel):
    id: str
    user_id: str | None
    payload: PreferencesPayload
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Request shapes (router inputs)
# ---------------------------------------------------------------------------

class ProseDocCreate(BaseModel):
    content: str = Field(min_length=1, max_length=500_000)


class OptimizedDocUpsert(BaseModel):
    prose_doc_id: str | None = None
    payload: OptimizedPayload
    markdown_view: str | None = None
    source: OptimizedDocSource = "llm"


class PreferencesUpsert(BaseModel):
    payload: PreferencesPayload


class TurnAppend(BaseModel):
    conversation_type: ConversationType
    role: TurnRole
    content: str = Field(min_length=1, max_length=50_000)
    skipped: bool = False
    prose_doc_id: str | None = None
