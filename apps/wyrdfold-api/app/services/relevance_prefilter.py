"""Ingestion-time relevance pre-filter via Voyage embeddings.

The keyword scorer can't precision-tune past the noise floor — even with
PRs #770/#771/#776 wired in, a senior target like "Director of CX
Operations & Transformation" still saw thousands of incidentally-matched
postings ("Director of GTM Systems", "Director of AI Deployment",
"Executive Communications Manager") sitting in the 5–25 score band.

The fix is structural: gate ingestion on
``cosine(target_label_embedding, job_title_embedding) >= threshold``.
Voyage-3-lite gives us 512-dim semantic vectors for ~$0.001 per poll
cycle; off-topic titles never make it into ``scores`` so the user's
list view stays clean without a UI score-floor needing to do the work.

Fail-open semantics
-------------------
Both ``label_embedding`` and ``title_embedding`` are nullable. When
either side is missing — fresh target with no label embedding yet,
mock-embeddings client returning zeros, Voyage outage — the gate
admits the posting and lets the downstream keyword scorer handle it.
That's the safe direction: under-filtering recreates the old behaviour
the user already accepts; over-filtering would silently drop relevant
postings with no signal that anything was wrong.
"""

from __future__ import annotations

import logging
import math
from collections.abc import Sequence

from app.models.embeddings import EmbeddingModelId

logger = logging.getLogger(__name__)

# Model used for both target labels and job titles. Same model on both
# sides is required for cosine to be meaningful — different model
# families embed into different latent spaces and the dot products mean
# nothing across them.
PREFILTER_MODEL: EmbeddingModelId = "voyage-3-lite"

# Vector dimension for ``voyage-3-lite``. The DB column is declared
# ``vector(512)`` to match (see migration 20260601160000).
PREFILTER_VECTOR_DIMS = 512

# Cosine threshold. Calibrated against a 500-job sample under Melissa's
# "Director of CX Operations & Transformation" target:
#
#   threshold 0.55: excludes  1% of jobs  (effectively pass-through)
#   threshold 0.65: excludes 12%
#   threshold 0.70: excludes 36%
#   threshold 0.75: excludes 75%
#   threshold 0.78: excludes 91%  <- chosen
#   threshold 0.82: excludes 99%  (starts dropping legitimate matches
#                                   like "Director of Customer Success"
#                                   which sits at 0.85)
#
# Short job titles cluster tighter in voyage-3-lite than the docs
# suggest — corporate Director-level roles all sit in 0.75-0.85 vs each
# other regardless of domain. 0.78 strikes the best balance we found:
# trims out "Senior Software Engineer" / "Pharmacy Technician" / "Sales
# Rep" cleanly while keeping near-matches like "Head of Customer
# Operations". The residual noise (Director of GTM Systems etc., which
# also sit around 0.80) is the next iteration's problem — feedback
# loop, asymmetric query/document embeddings, or full-JD context.
PREFILTER_THRESHOLD: float = 0.78


def cosine_similarity(a: Sequence[float], b: Sequence[float]) -> float:
    """Cosine similarity between two equal-length vectors. Returns 0.0
    for degenerate inputs (empty / mismatched length / zero norm) so
    callers can safely use the result in comparisons without guarding.
    """
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = 0.0
    na = 0.0
    nb = 0.0
    for x, y in zip(a, b, strict=False):
        dot += x * y
        na += x * x
        nb += y * y
    if na == 0.0 or nb == 0.0:
        return 0.0
    return dot / (math.sqrt(na) * math.sqrt(nb))


def title_passes_prefilter(
    title_embedding: list[float] | None,
    target_label_embeddings: Sequence[list[float] | None],
    threshold: float = PREFILTER_THRESHOLD,
) -> bool:
    """Return True if the job title is semantically close enough to at
    least one of the target labels. The gate admits when:

    - ``title_embedding`` is missing (couldn't compute → don't drop),
    - ``target_label_embeddings`` is empty (no targets to score against),
    - any target's embedding is missing (fail-open per target — we'd
      rather over-admit one target's worth of postings than silently
      drop them), or
    - cosine against any present target embedding meets the threshold.
    """
    if title_embedding is None:
        return True
    if not target_label_embeddings:
        return True
    for t_embed in target_label_embeddings:
        if t_embed is None:
            # Fail-open per target: a target without an embedding hasn't
            # been processed yet by the lazy back-fill in the poller.
            return True
        if cosine_similarity(title_embedding, t_embed) >= threshold:
            return True
    return False


async def prepare_prefilter(
    supabase: object,
    embeddings_client: object,
    active_targets: Sequence[object],
    titles: Sequence[str],
) -> tuple[list[list[float] | None], list[list[float] | None]]:
    """Ensure every active target has a ``label_embedding`` and produce
    embeddings for every job title in this poll cycle.

    Lazy-fills missing target embeddings (persists to ``targets`` and
    mutates the in-memory ``JobTarget`` instances), then batch-embeds
    the job titles in one Voyage call. Caller iterates ``(job, title_embed)``
    pairs and calls ``title_passes_prefilter`` to gate.

    Returns ``(target_label_embeddings, title_embeddings)`` in the same
    order as the inputs. Both lists may contain ``None`` entries when an
    embedding couldn't be computed (mock client returning zeros, Voyage
    outage, empty input string) — the gate fails open for those.

    Untyped parameters because the imports it needs (``Client``,
    ``EmbeddingsClient``, ``JobTarget``) are circular at the module
    level; the poller pins them at the call site.
    """
    from supabase import Client

    from app.models.targets import JobTarget
    from app.services.embeddings.client import EmbeddingsClient
    from app.services.llm.cost_log import record_embedding

    supabase_typed: Client = supabase  # type: ignore[assignment]
    client: EmbeddingsClient = embeddings_client  # type: ignore[assignment]
    targets: list[JobTarget] = active_targets  # type: ignore[assignment]

    # 1. Back-fill missing target label embeddings (lazy, one row at a time
    #    — typically 1-3 targets per call; not worth a batch).
    needs_embed = [t for t in targets if t.label_embedding is None]
    if needs_embed:
        labels = [t.label for t in needs_embed]
        result = await client.embed(
            model=PREFILTER_MODEL,
            inputs=labels,
            purpose="embed.target_label",
        )
        if result.embeddings:
            try:
                record_embedding(
                    supabase_typed,
                    user_id=None,
                    purpose="embed.target_label",
                    result=result,
                )
            except Exception:
                logger.exception("Failed to record embedding cost (target labels)")
            for target, embed in zip(needs_embed, result.embeddings, strict=False):
                # Persist + mutate in-memory so subsequent gate runs in
                # the same poll cycle use the fresh embedding.
                try:
                    supabase_typed.table("targets").update(
                        {"label_embedding": embed}
                    ).eq("id", target.id).execute()
                except Exception:
                    logger.exception(
                        "Failed to persist label_embedding for target %s", target.id
                    )
                target.label_embedding = list(embed)

    target_label_embeddings: list[list[float] | None] = [
        t.label_embedding for t in targets
    ]

    # 2. Batch-embed job titles. Empty strings are kept to preserve
    #    positional correspondence with the input list; the gate treats
    #    None-embeddings as fail-open so an empty title admits.
    sanitized = [t.strip() for t in titles]
    has_content = [bool(t) for t in sanitized]
    payload = [t for t in sanitized if t]
    title_embeddings: list[list[float] | None] = [None] * len(titles)
    if payload:
        result = await client.embed(
            model=PREFILTER_MODEL,
            inputs=payload,
            purpose="embed.job_title_prefilter",
        )
        if result.embeddings:
            try:
                record_embedding(
                    supabase_typed,
                    user_id=None,
                    purpose="embed.job_title_prefilter",
                    result=result,
                )
            except Exception:
                logger.exception("Failed to record embedding cost (job titles)")
            it = iter(result.embeddings)
            for i, present in enumerate(has_content):
                if present:
                    title_embeddings[i] = list(next(it))

    return target_label_embeddings, title_embeddings
