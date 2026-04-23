"""Embeddings client Protocol.

Single method: embed a batch of strings. Real and mock implementations
both satisfy it. Batching is the API's natural unit — Voyage charges
per-token regardless of how many inputs you bundle, and one batch is
one HTTP roundtrip.
"""

from typing import Protocol

from app.models.embeddings import EmbeddingModelId, EmbeddingResult


class EmbeddingsClient(Protocol):
    async def embed(
        self,
        *,
        model: EmbeddingModelId,
        inputs: list[str],
        purpose: str,
    ) -> EmbeddingResult:
        """Embed a batch of strings.

        Args:
            model: Voyage model ID.
            inputs: Strings to embed. Empty list returns an EmbeddingResult
                with empty embeddings and zero cost.
            purpose: Cost-log grouping label (e.g. "experience.chunks",
                "tailor.retrieval"). Required so spend can be sliced by feature.
        """
        ...
