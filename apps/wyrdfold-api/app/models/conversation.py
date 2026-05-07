"""Pydantic models for the conversation orchestrator (#185 P2d)."""

from typing import Literal

from pydantic import BaseModel, Field, model_validator

from app.models.experience import AnnotationAction, AnnotationRefType, ConversationType

GapKind = Literal[
    "role.missing_outcomes",
    "role.missing_summary",
    "role.missing_end_date",
    "outcome.missing_metric",
    "skill.missing_evidence",
    "content.empty",
]


class Gap(BaseModel):
    """A missing slot in the optimized doc worth probing for."""

    kind: GapKind
    ref: str
    priority: int
    context: str


class TurnRequest(BaseModel):
    """Client payload for POST /experience/conversation/turn."""

    conversation_type: ConversationType
    content: str = Field(default="", max_length=50_000)
    skipped: bool = False

    @model_validator(mode="after")
    def _require_content_unless_skipped(self) -> "TurnRequest":
        if not self.skipped and not self.content:
            raise ValueError("content is required when skipped is false")
        return self


class LLMAnnotationDirective(BaseModel):
    """Parsed annotation intent from a conversation turn (#499)."""

    action: AnnotationAction
    ref_type: AnnotationRefType
    ref_value: str
    target_label: str | None = None
    reason: str | None = None


class LLMTurnResponse(BaseModel):
    """The structured shape the LLM must return.

    - `assistant_message`: the question or acknowledgement shown to the user.
    - `prose_append`: optional chunk of narrative to append to the prose doc.
      The LLM can only *append*, never rewrite existing prose.
    - `done`: true when the orchestrator should stop probing for this phase.
    - `annotation`: optional annotation directive parsed from user intent (#499).
    """

    assistant_message: str = Field(min_length=1, max_length=10_000)
    prose_append: str | None = None
    done: bool = False
    annotation: LLMAnnotationDirective | None = None


class TurnResult(BaseModel):
    """What POST /experience/conversation/turn returns to the client."""

    assistant_message: str
    prose_updated: bool
    prose_version: int | None
    done: bool


class ProbeResult(BaseModel):
    """What GET /experience/conversation/next-probe returns.

    `gap` is None when there are no gaps worth probing.
    """

    question: str
    gap: Gap | None


class ResetResult(BaseModel):
    """What POST /experience/conversation/reset returns."""

    prose_versions_deleted: int
    optimized_versions_deleted: int
    turns_deleted: int


# ---------------------------------------------------------------------------
# Gap health (#498)
# ---------------------------------------------------------------------------

GapTier = Literal["red", "yellow", "green"]

GateReason = Literal["no_roles", "insufficient_outcomes"]


class GapHealthResult(BaseModel):
    """Weighted completeness metric over the master document."""

    gap_pct: float
    tier: GapTier
    gaps: list[Gap]
    total_weight: int
    gap_weight: int


class GateResult(BaseModel):
    """Structural minimum check for generation readiness."""

    ok: bool
    reason: GateReason | None = None
    message: str = ""
