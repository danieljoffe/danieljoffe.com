"""Real Voyage embeddings client.

Production implementation of the EmbeddingsClient Protocol. Uses the
official `voyageai` SDK's AsyncClient. Swap in via
`EMBEDDINGS_PROVIDER=voyage` env var; mock is the default until you
explicitly opt in.

Input type
----------
Voyage supports asymmetric embeddings via the `input_type` parameter:
`"document"` for stored text, `"query"` for search queries. Our chunk
write path embeds documents; a future tailor-side retrieval path would
embed queries. This client hardcodes `"document"` — the Protocol
doesn't expose input_type today, so when retrieval lands we extend the
Protocol rather than leak vendor-specific vocabulary into every caller.
"""

from __future__ import annotations

import time
from typing import Any

from voyageai.client_async import AsyncClient

from app.models.embeddings import EmbeddingModelId, EmbeddingResult, EmbeddingUsage
from app.services.embeddings.pricing import calculate_cost


class VoyageEmbeddingsClient:
    """Implements the EmbeddingsClient Protocol. Production-ready."""

    def __init__(
        self,
        *,
        api_key: str | None = None,
        timeout: float = 60.0,
        max_retries: int = 2,
    ) -> None:
        # voyageai's AsyncClient accepts api_key, timeout, max_retries.
        # It falls back to VOYAGE_API_KEY env var when api_key is None.
        self._client = AsyncClient(
            api_key=api_key,
            timeout=timeout,
            max_retries=max_retries,
        )

    async def embed(
        self,
        *,
        model: EmbeddingModelId,
        inputs: list[str],
        purpose: str,
    ) -> EmbeddingResult:
        if not inputs:
            # Don't call the API for an empty batch — save a roundtrip.
            return EmbeddingResult(
                embeddings=[],
                model=model,
                usage=EmbeddingUsage(input_tokens=0),
                cost_usd=0.0,
                latency_ms=0,
            )

        start = time.perf_counter()
        response: Any = await self._client.embed(
            texts=inputs,
            model=model,
            input_type="document",
        )
        latency_ms = int((time.perf_counter() - start) * 1000)

        # voyageai returns a result object with .embeddings (list[list[float]])
        # and .total_tokens (int).
        usage = EmbeddingUsage(input_tokens=int(response.total_tokens))
        cost = calculate_cost(model, usage)

        return EmbeddingResult(
            embeddings=list(response.embeddings),
            model=model,
            usage=usage,
            cost_usd=cost,
            latency_ms=latency_ms,
        )
