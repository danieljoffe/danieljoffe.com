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

Also include a confidence score (0-100) per verdict — how certain you \
are about the promising/unpromising call. Use this scale:

- 90-100: bullseye obvious. "Director of CX Operations" for a "Director \
of CX Operations" target (promising 100); "Senior Frontend Engineer" \
for the same target (unpromising 100).
- 70-89: confident. Adjacent specialisation or one-rung-off seniority \
that fits cleanly under the lean-promising rule (or its inverse for \
unpromising).
- 40-69: legitimately ambiguous — could go either way. Use this band \
honestly; downstream tooling will rely on it to deprioritise borderline \
cases when the Phase 2 cap bites.
- 0-39: hedged. You're guessing. Still emit a verdict (the lean-promising \
rule applies here too), but flag your low certainty.

Confidence is the model's certainty in its verdict, NOT a fit score. \
A high-confidence UNPROMISING is just as useful as a high-confidence \
PROMISING — both let downstream tooling skip Phase 2 work.

Return JSON matching this exact schema:

{
  "verdicts": [
    {"id": 1, "promising": true,  "confidence": 95},
    {"id": 2, "promising": false, "confidence": 88},
    {"id": 3, "promising": true,  "confidence": 55}
  ]
}

One verdict per input title, keyed by the input id. Do NOT omit ids — \
if you can't decide, default to PROMISING with confidence < 50. Return \
ONLY the JSON object. No prose, no markdown, no code fences."""


class TitleVerdict(BaseModel):
    """One LLM verdict for one input title.

    ``id`` matches the 1-based position in the input batch — the caller
    maps it back to a job_id. We use integer ids (not the job UUID)
    because numeric ids are cheaper for the model to track than UUIDs.

    ``confidence`` is optional for back-compat: pre-confidence-prompt
    responses don't include it (defaults to None). When present, it's
    the model's 0-100 certainty in the ``promising`` verdict (not a fit
    score — see prompt). The poller persists this to
    ``scores.phase1_confidence`` so ``phase2_runner`` can order
    Phase 2 candidates by confidence DESC.
    """

    id: int = Field(ge=1)
    promising: bool
    confidence: int | None = Field(default=None, ge=0, le=100)


class TitleTriageResponse(BaseModel):
    """LLM response: one ``TitleVerdict`` per input title."""

    verdicts: list[TitleVerdict] = Field(default_factory=list)


def _split_user_message(target: JobTarget, titles: list[str]) -> tuple[str, str]:
    """Compose the per-call user message as ``(static_prefix, dynamic_suffix)``.

    Target context (label + example pools) sits at the top so it's a
    natural prompt-cache prefix when grading multiple batches for the
    same target in one poll cycle. The split boundary feeds
    ``Message.cache_prefix_chars`` — the prefix depends only on the
    target, the suffix carries the per-batch titles. Concatenating the
    two halves yields the exact message Phase 1 has always sent (the
    boundary newline lives in the suffix so the cached prefix bytes
    never vary with the batch).
    """
    static_lines: list[str] = [f"Target role: {target.label}"]

    if target.example_promising_titles:
        static_lines.append("")
        static_lines.append("Examples of PROMISING titles for this target:")
        for ex in target.example_promising_titles:
            static_lines.append(f"- {ex}")

    if target.example_unpromising_titles:
        static_lines.append("")
        static_lines.append("Examples of UNPROMISING titles:")
        for ex in target.example_unpromising_titles:
            static_lines.append(f"- {ex}")

    dynamic_lines: list[str] = [""]
    dynamic_lines.append(
        f"Grade the following {len(titles)} candidate titles. Return one "
        "verdict per id."
    )
    dynamic_lines.append("")
    for idx, title in enumerate(titles, start=1):
        dynamic_lines.append(f"{idx}. {title}")

    return "\n".join(static_lines), "\n" + "\n".join(dynamic_lines)


def _build_user_message(target: JobTarget, titles: list[str]) -> str:
    """Full user message — concatenation of the cache-split halves."""
    static_prefix, dynamic_suffix = _split_user_message(target, titles)
    return static_prefix + dynamic_suffix


async def triage_titles(
    llm: LLMClient,
    *,
    target: JobTarget,
    titles: list[str],
    model: ModelId = PHASE1_MODEL,
    purpose: str = PHASE1_PURPOSE,
) -> tuple[dict[int, TitleVerdict], LLMResult | None]:
    """Grade up to ``PHASE1_BATCH_SIZE`` titles against one target.

    Returns ``(verdicts_by_index, llm_result)`` where:
    - ``verdicts_by_index`` maps the 1-based input index to a
      ``TitleVerdict`` carrying ``promising`` (bool) and ``confidence``
      (int 0-100, or None on legacy / partial responses). Indices missing
      from the dict mean "no verdict"; callers must treat that as
      fail-open (admit the job) so a partial LLM hiccup doesn't drop
      relevant postings.
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

    static_prefix, dynamic_suffix = _split_user_message(target, titles)
    user_message = static_prefix + dynamic_suffix

    try:
        parsed, result = await complete_json(
            llm,
            model=model,
            system=_SYSTEM_PROMPT,
            # ``cache_prefix_chars`` marks the per-target context (label
            # + example pools) as a prompt-cache breakpoint — the second
            # cacheable prefix after the system prompt. Bytes-identical
            # split, see Message model.
            messages=[
                Message(
                    role="user",
                    content=user_message,
                    cache_prefix_chars=len(static_prefix),
                )
            ],
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
    # ``.get(i)``-returns-None pattern).
    return {v.id: v for v in parsed.verdicts}, result
