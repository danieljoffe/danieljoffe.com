"""Consolidate the master prose document — dedupe duplicated sections.

Older prose docs were assembled by naive concat-with-divider on every resume
upload, leaving the doc with multiple near-identical resume copies separated
by ``--- [Uploaded Resume: ...]`` markers. The current ingest path uses a
semantic merge so future uploads stay clean, but pre-existing bloat needs an
explicit consolidation pass.

This module runs an LLM-backed self-merge: the input is the existing prose,
the output is the same document with duplicate roles/outcomes/skills folded
into a single canonical mention. No facts are added or removed beyond the
duplicates themselves.
"""

from __future__ import annotations

import logging
from typing import Literal

from app.models.llm import LLMResult, Message, ModelId
from app.services.llm.client import LLMClient

logger = logging.getLogger(__name__)

DEFAULT_MODEL: ModelId = "claude-sonnet-4-6"
DEFAULT_PURPOSE = "experience.prose_consolidate"

# Big enough for realistic master docs with 5+ duplicate resume copies.
CONSOLIDATE_MAX_TOKENS = 16_384

# Skip the LLM call entirely for short docs — nothing meaningful to dedupe.
MIN_CONSOLIDATE_CHARS = 4_000

# Output guardrails. The LLM is expected to shrink the doc, but a result that
# collapses to almost nothing means it likely paraphrased the whole thing into
# a summary instead of merging duplicates. Reject and fall back to the input.
#
# A doc with 8 near-identical resume copies legitimately consolidates to ~12%
# of input length, so the floor must sit well below that. 0.05 still catches
# the "LLM returned a one-line summary" case without throwing away valid
# heavy-dedup runs. Pair with the `fallback_reason` signal in the response so
# the caller can tell when the safety net fired.
MIN_OUTPUT_RATIO = 0.05

FallbackReason = Literal["output_too_short"]

# Conversely, if the output is nearly the same length as the input, the LLM
# didn't actually consolidate anything. We still persist it (the version is
# cheap), but the caller may want to surface a "no duplicates found" hint.
NO_OP_RATIO = 0.97

SYSTEM_PROMPT = """You consolidate a master career document that has \
accumulated duplicate or near-duplicate content from multiple resume uploads \
or edits. Your job is to produce a single coherent document that retains \
every unique fact while removing redundancy.

Rules:
- Identify content that appears multiple times in different forms — the same \
role at the same company, the same accomplishment with different wording, \
the same skill listed in multiple places — and merge each into a single \
canonical mention.
- Preserve every unique fact across the duplicates. If one copy lists a \
quantified outcome, a date, a skill, or a detail that another copy omits, \
keep it in the consolidated version.
- Remove section dividers and upload markers that indicate the document was \
stitched from multiple sources (for example lines like "---", \
"[Uploaded Resume: <filename>]", or repeated headers).
- Organize the consolidated content sensibly: a brief intro/summary if \
present, then roles in reverse-chronological order with their accomplishments \
and skills, then any additional sections the input contains.
- Preserve inline HTML comments verbatim (lines containing `<!-- ... -->`) — \
these are user directives consumed downstream.
- Do NOT invent facts that are not present in any copy.
- Do NOT paraphrase distinctive phrasing the user wrote — when wording differs \
across duplicates, prefer the version with more detail.
- Output ONLY the consolidated document. No preamble, no code fences, no \
commentary."""


async def consolidate_prose(
    llm: LLMClient,
    *,
    content: str,
    model: ModelId = DEFAULT_MODEL,
    purpose: str = DEFAULT_PURPOSE,
) -> tuple[str, LLMResult | None, FallbackReason | None]:
    """Run consolidation on a prose doc.

    Returns ``(consolidated_text, llm_result, fallback_reason)``. If the input
    is too short to benefit from consolidation, returns ``(content, None, None)``
    with no LLM call.

    Safety net: if the LLM output is suspiciously short (likely paraphrased
    rather than consolidated), falls back to the original ``content`` so user
    facts are never silently lost. ``fallback_reason`` records which guard
    fired so callers can surface the rejection in logs and the response.
    """
    if len(content) < MIN_CONSOLIDATE_CHARS:
        return content, None, None

    result = await llm.complete(
        model=model,
        system=SYSTEM_PROMPT,
        messages=[Message(role="user", content=content)],
        purpose=purpose,
        max_tokens=CONSOLIDATE_MAX_TOKENS,
        cache_system=True,
    )

    consolidated = result.content.strip()
    if len(consolidated) < len(content) * MIN_OUTPUT_RATIO:
        logger.warning(
            "consolidate_prose: output below MIN_OUTPUT_RATIO floor, "
            "falling back to input (input=%d chars, output=%d chars, floor=%.2f)",
            len(content),
            len(consolidated),
            MIN_OUTPUT_RATIO,
        )
        return content, result, "output_too_short"

    return consolidated, result, None


def is_no_op(*, before: str, after: str) -> bool:
    """True if consolidation didn't materially change the doc length."""
    if not before:
        return True
    return len(after) >= len(before) * NO_OP_RATIO
