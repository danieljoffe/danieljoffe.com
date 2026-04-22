"""Pydantic models for the LLM plumbing layer (#185 P2a).

Interface-only. The real Anthropic client ships in a later phase;
P2a uses MockLLMClient so the rest of the system can be wired up and
tested without external API calls.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

ModelId = Literal[
    "claude-opus-4-7",
    "claude-sonnet-4-6",
    "claude-haiku-4-5",
]
"""Models this workspace targets. Extend as new models land."""

TurnRole = Literal["user", "assistant"]


class Message(BaseModel):
    role: TurnRole
    content: str


class LLMUsage(BaseModel):
    input_tokens: int = 0
    output_tokens: int = 0
    cache_read_input_tokens: int = 0
    cache_creation_input_tokens: int = 0


class LLMResult(BaseModel):
    content: str
    model: ModelId
    usage: LLMUsage
    cost_usd: float
    latency_ms: int


class LLMCallRecord(BaseModel):
    id: str
    user_id: str | None
    model: ModelId
    purpose: str
    input_tokens: int
    output_tokens: int
    cache_read_input_tokens: int
    cache_creation_input_tokens: int
    cost_usd: float
    latency_ms: int
    metadata: dict[str, str | int | float | bool] = Field(default_factory=dict)
    created_at: datetime
