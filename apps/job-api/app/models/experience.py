"""Pydantic models for the experience module (#185 P1).

Two-doc content model:
- ProseDoc: user-owned narrative. Append-only from conversation turns.
- OptimizedDoc: LLM-derived structured projection of the prose. User-editable.

Chunks, turns, and preferences support retrieval, chat, and persistent style bias.
"""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

ConversationType = Literal["onboarding", "update"]
TurnRole = Literal["user", "assistant", "system"]
ChunkType = Literal["role", "skill", "outcome", "summary"]
OptimizedDocSource = Literal["llm", "user_edit"]
AnnotationAction = Literal["emphasize", "exclude", "de-emphasize"]
AnnotationRefType = Literal["role", "skill", "outcome"]


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


class Annotation(BaseModel):
    """User directive for per-target emphasis or exclusion (#499).

    `id` defaults to a fresh UUID so the LLM (in derive.py) can omit it
    when extracting annotations from prose comments — the server fills it in.
    """

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    action: AnnotationAction
    ref_type: AnnotationRefType
    ref_value: str
    target_label: str | None = None
    reason: str | None = None


class OptimizedPayload(BaseModel):
    summary: str | None = None
    roles: list[Role] = Field(default_factory=list)
    skills: list[Skill] = Field(default_factory=list)
    outcomes: list[Outcome] = Field(default_factory=list)
    annotations: list[Annotation] = Field(default_factory=list)


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

class AnnotationCreate(BaseModel):
    action: AnnotationAction
    ref_type: AnnotationRefType
    ref_value: str = Field(min_length=1, max_length=500)
    target_label: str | None = None
    reason: str | None = None


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


# ---------------------------------------------------------------------------
# Response shapes (router outputs)
# ---------------------------------------------------------------------------

class ResumeUploadResponse(BaseModel):
    success: bool
    prose_doc_id: str
    prose_version: int
    upload_id: str
    extracted_chars: int
    filename: str
    warnings: list[str] = []
    optimized_doc_id: str | None = None


class ProseConsolidateResponse(BaseModel):
    """Result of running consolidation on the master prose doc.

    ``no_op`` is true when the input was either too short to consolidate or
    the LLM returned a doc roughly the same length, suggesting nothing was
    deduped. The frontend uses it to surface a "no duplicates found" hint
    instead of a generic success toast.

    ``fallback_reason`` is populated when the consolidation safety net fired
    and the original input was returned in place of the LLM output (e.g. the
    LLM produced a too-short result that looked like a summary). When present,
    ``no_op`` will also be true; the field lets callers distinguish "nothing
    to dedupe" from "we threw away the LLM's answer."
    """

    prose: ProseDoc
    chars_before: int
    chars_after: int
    no_op: bool
    fallback_reason: str | None = None
