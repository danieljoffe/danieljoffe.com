"""Chunking + chunk-write path for the optimized doc.

Decomposes an OptimizedPayload into retrievable units (one per role,
skill, outcome, plus a summary chunk), embeds them in a single batch
call, and writes them to experience_chunks. Old chunks for the same
optimized_doc_id are deleted first so the function is idempotent.

Pure decomposition lives in `chunks_for_optimized()` so it can be
unit-tested without a DB or embedding client.
"""

from __future__ import annotations

import hashlib
from typing import Any, cast

from pydantic import BaseModel, Field
from supabase import Client

from app.models.embeddings import EmbeddingModelId
from app.models.experience import Chunk, ChunkType, OptimizedDoc, OptimizedPayload
from app.services.embeddings.client import EmbeddingsClient
from app.services.llm import cost_log

TABLE = "experience_chunks"
DEFAULT_PURPOSE = "experience.chunks"


class ChunkInput(BaseModel):
    """Pre-embed shape: what we want to insert, minus the vector."""

    chunk_type: ChunkType
    chunk_ref: str
    content: str
    metadata: dict[str, str | int | float | bool] = Field(default_factory=dict)


def _outcome_ref(description: str) -> str:
    return hashlib.sha256(description.encode("utf-8")).hexdigest()[:16]


def chunks_for_optimized(payload: OptimizedPayload) -> list[ChunkInput]:
    """Decompose an OptimizedPayload into retrievable chunks.

    One chunk per role, skill, outcome, plus an optional summary chunk.
    Order is stable (summary, roles in declared order, skills, outcomes)
    so embeddings line up with inputs by index.
    """
    out: list[ChunkInput] = []

    if payload.summary:
        out.append(
            ChunkInput(
                chunk_type="summary",
                chunk_ref="summary",
                content=payload.summary,
            )
        )

    for role in payload.roles:
        end = role.end or "present"
        text = f"{role.title} at {role.company} ({role.start} to {end})"
        if role.summary:
            text += f"\n{role.summary}"
        if role.skills:
            text += f"\nSkills: {', '.join(role.skills)}"
        out.append(
            ChunkInput(
                chunk_type="role",
                chunk_ref=role.id,
                content=text,
                metadata={"company": role.company, "title": role.title},
            )
        )

    for skill in payload.skills:
        text = skill.name
        if skill.years is not None:
            text += f" ({skill.years} years)"
        out.append(
            ChunkInput(
                chunk_type="skill",
                chunk_ref=skill.name.lower(),
                content=text,
                metadata={"name": skill.name},
            )
        )

    for outcome in payload.outcomes:
        text = outcome.description
        if outcome.metric and outcome.value:
            text += f" — {outcome.metric}: {outcome.value}"
        out.append(
            ChunkInput(
                chunk_type="outcome",
                chunk_ref=_outcome_ref(outcome.description),
                content=text,
                metadata={"role_ref": outcome.role_ref or ""},
            )
        )

    return out


def _delete_existing(supabase: Client, optimized_doc_id: str) -> None:
    supabase.table(TABLE).delete().eq("optimized_doc_id", optimized_doc_id).execute()


async def upsert_for_optimized(
    supabase: Client,
    embeddings: EmbeddingsClient,
    optimized: OptimizedDoc,
    *,
    user_id: str | None,
    model: EmbeddingModelId = "voyage-3",
    purpose: str = DEFAULT_PURPOSE,
) -> list[Chunk]:
    """Generate, embed, and persist chunks for an optimized doc.

    Idempotent: deletes any existing chunks for this doc_id before insert.
    Records embedding cost in llm_costs under `purpose`.
    """
    inputs = chunks_for_optimized(optimized.payload)
    _delete_existing(supabase, optimized.id)

    if not inputs:
        return []

    result = await embeddings.embed(
        model=model,
        inputs=[c.content for c in inputs],
        purpose=purpose,
    )
    cost_log.record_embedding(
        supabase,
        user_id=user_id,
        purpose=purpose,
        result=result,
        metadata={"optimized_doc_id": optimized.id, "chunk_count": len(inputs)},
    )

    rows: list[dict[str, Any]] = [
        {
            "optimized_doc_id": optimized.id,
            "chunk_type": c.chunk_type,
            "chunk_ref": c.chunk_ref,
            "content": c.content,
            "metadata": c.metadata,
            "embedding": vector,
        }
        for c, vector in zip(inputs, result.embeddings, strict=True)
    ]
    resp = supabase.table(TABLE).insert(rows).execute()
    inserted = cast(list[dict[str, Any]], resp.data or [])
    return [Chunk.model_validate(r) for r in inserted]
