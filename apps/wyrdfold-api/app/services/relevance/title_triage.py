"""Phase 1: per-target LLM binary title triage.

Replaces the cosine prefilter as the ingestion-time gate. Given a
batch of job titles + a target's label + the target's auto-generated
example title pools (from PR #788), the LLM returns a binary verdict
per title: PROMISING (worth deeper scoring) or UNPROMISING (drop).

Why this beats cosine
- voyage-3-lite cosines cluster all senior corporate roles in
  0.75-0.85 regardless of domain. No threshold reliably separates
  "Frontend Engineer" from "Product Designer" — both score ~0.8 vs
  a Frontend target. See ``plan-llm-scoring-migration.md``.
- An LLM with a few-shot prompt grounded in target-specific examples
  has the discrimination the embedding model lacks. Cheap enough
  (Haiku 4.5 at ~$0.0001/job) that the per-cycle cost is dominated
  by the polling itself.

Output contract
- Bool only. Phase 2 emits the 0-100 score; Phase 1 just gates.
- Bias is asymmetric: false positives in Phase 1 are cheap (Phase 2
  catches them); false negatives are lost forever. The prompt
  explicitly tells the model to lean PROMISING on close calls.

Persistence
- Phase 1 verdict is written to ``scores.promising`` for the
  (job, target) pair. ``True`` = admitted, ``NULL`` = legacy /
  pre-Phase-1 / Phase-1 unavailable (fail-open). ``False`` is not
  persisted because Phase-1-rejected jobs are not ingested under
  this target — no scores row exists for them at all (matches the
  prior cosine-skip semantics).

Batching
- 250 titles per LLM call by default. At Haiku 4.5 input pricing
  (~$1/1M) + ~50 tokens per title input + ~10 tokens per verdict
  output, that's ~$0.015 per batch. Voyage-style internal
  parallelization isn't needed — the model handles 250 inputs
  comfortably within its context window.

Fail-open
- Any LLM/network error returns an empty verdict map. The poller
  reads "no verdict" as "fail-open admit" so a Phase 1 outage
  doesn't stop ingestion — it just removes the precision filter
  for that poll cycle. Symmetric with the cosine prefilter's
  prior contract.
"""

from __future__ import annotations

import logging

from pydantic import BaseModel, Field

from app.models.llm import LLMResult, Message, ModelId
from app.models.targets import JobTarget
from app.services.llm.client import LLMClient, complete_json

logger = logging.getLogger(__name__)

# Haiku 4.5 — the cheap-fast tier. At ~$1/1M input tokens it's two
# orders of magnitude under Sonnet for what's a binary classification
# task. Switching back to Sonnet would just inflate cost without
# moving precision in any test I've run; Phase 2 is where Sonnet
# earns its keep.
PHASE1_MODEL: ModelId = "claude-haiku-4-5"
PHASE1_PURPOSE = "relevance.title_triage"

# Per-call batch size. Each batch fits in one Haiku prompt
# comfortably (250 x~50 input tokens = 12.5K, well under the 200K
# context). The poller chunks larger candidate sets and calls in
# series; Anthropic prompt caching on the static system + per-target
# context keeps the marginal cost of additional batches low.
PHASE1_BATCH_SIZE = 250


_SYSTEM_PROMPT = """\
You are a job-title relevance gate. For each candidate title in the \
batch you receive, decide whether it is plausibly a match for the \
user's target role.

Be GENEROUS on close calls. A downstream grader does deeper analysis on \
everything you mark PROMISING; a false-positive there is cheap. A \
false-negative here is lost forever — the user will never see the \
posting. When uncertain, mark PROMISING.

What "promising" means
- Same career direction as the target. A "Staff Web Engineer" for a \
"Staff Frontend Engineer" target = PROMISING. A "Senior Backend \
Engineer" for a Frontend target = UNPROMISING.
- Same role function. Engineering vs design vs PM vs marketing vs \
sales vs ops are different functions. Tech-keyword overlap (TypeScript, \
accessibility, design system) is NOT enough — the ROLE FUNCTION must \
match.
- Seniority can flex by one rung in either direction. Stricter \
seniority match isn't your job; downstream code handles that.
- Adjacent specializations are fine when they share the target's core \
discipline (e.g., "Full-Stack Engineer" for a Frontend target = \
PROMISING because the core skill set overlaps).

What "unpromising" means
- Different role function. Designer vs engineer. Marketing vs CX. \
Sales vs operations.
- Wildly different domain (e.g., a hospital "Care Coordinator" for a \
tech "Director of CX" target).
- Clearly off-discipline even if the title shares a word ("Director of \
Sales" for a "Director of CX" target).

Return JSON matching this exact schema:

{
  "verdicts": [
    {"id": 1, "promising": true},
    {"id": 2, "promising": false},
    {"id": 3, "promising": true}
  ]
}

One verdict per input title, keyed by the input id. Do NOT omit ids — \
if you can't decide, default to PROMISING. Return ONLY the JSON \
object. No prose, no markdown, no code fences."""


class TitleVerdict(BaseModel):
    """One LLM verdict for one input title.

    ``id`` matches the 1-based position in the input batch — the caller
    maps it back to a job_id. We use integer ids (not the job UUID)
    because numeric ids are cheaper for the model to track than UUIDs.
    """

    id: int = Field(ge=1)
    promising: bool


class TitleTriageResponse(BaseModel):
    """LLM response: one ``TitleVerdict`` per input title."""

    verdicts: list[TitleVerdict] = Field(default_factory=list)


def _build_user_message(target: JobTarget, titles: list[str]) -> str:
    """Compose the per-call user message: target context + numbered batch.

    Target context (label + example pools) sits at the top so it's a
    natural prompt-cache prefix when grading multiple batches for the
    same target in one poll cycle.
    """
    lines: list[str] = [f"Target role: {target.label}"]

    if target.example_promising_titles:
        lines.append("")
        lines.append("Examples of PROMISING titles for this target:")
        for ex in target.example_promising_titles:
            lines.append(f"- {ex}")

    if target.example_unpromising_titles:
        lines.append("")
        lines.append("Examples of UNPROMISING titles:")
        for ex in target.example_unpromising_titles:
            lines.append(f"- {ex}")

    lines.append("")
    lines.append(
        f"Grade the following {len(titles)} candidate titles. Return one "
        "verdict per id."
    )
    lines.append("")
    for idx, title in enumerate(titles, start=1):
        lines.append(f"{idx}. {title}")

    return "\n".join(lines)


async def triage_titles(
    llm: LLMClient,
    *,
    target: JobTarget,
    titles: list[str],
    model: ModelId = PHASE1_MODEL,
    purpose: str = PHASE1_PURPOSE,
) -> tuple[dict[int, bool], LLMResult | None]:
    """Grade up to ``PHASE1_BATCH_SIZE`` titles against one target.

    Returns ``(verdict_by_index, llm_result)`` where:
    - ``verdict_by_index`` maps the 1-based input index to ``True`` /
      ``False``. Indices missing from the dict mean "no verdict";
      callers must treat that as fail-open (admit the job) so a partial
      LLM hiccup doesn't drop relevant postings.
    - ``llm_result`` is the LLMResult for cost logging, or ``None`` if
      the call failed entirely (caller logs the exception via the
      ``logger`` import).

    Pass ``titles`` in the same order as the candidate job rows — the
    1-based id in the verdict map is the position into that list.
    """
    if not titles:
        return {}, None
    if len(titles) > PHASE1_BATCH_SIZE:
        # Defensive: callers are expected to chunk to PHASE1_BATCH_SIZE.
        # We don't truncate silently because losing the tail would be a
        # confusing data loss; raise loudly so the caller's batching
        # bug is visible.
        raise ValueError(
            f"triage_titles batch size {len(titles)} exceeds "
            f"PHASE1_BATCH_SIZE={PHASE1_BATCH_SIZE}. Chunk the input."
        )

    user_message = _build_user_message(target, titles)

    try:
        parsed, result = await complete_json(
            llm,
            model=model,
            system=_SYSTEM_PROMPT,
            messages=[Message(role="user", content=user_message)],
            schema=TitleTriageResponse,
            purpose=purpose,
            # Output is ~250 verdicts x~30 tokens each = ~7500 tokens.
            # 8192 gives us headroom for the JSON envelope.
            max_tokens=8192,
            cache_system=True,
        )
    except Exception:
        # Fail-open: log and return empty so the caller admits everything.
        logger.exception(
            "Phase 1 title triage failed for target %s (%s); admitting all",
            target.id,
            target.label,
        )
        return {}, None

    # Map verdicts by id. Tolerate the model returning duplicates (last
    # one wins) or omitting ids (treated as fail-open by the caller's
    # ``.get(i, True)`` pattern).
    return {v.id: v.promising for v in parsed.verdicts}, result
