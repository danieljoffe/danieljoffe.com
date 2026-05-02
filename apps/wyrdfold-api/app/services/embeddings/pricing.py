"""Voyage embedding pricing.

USD per million input tokens. No output dimension — embeddings only
charge for input. Source: voyage.ai pricing page as of 2026-04.
Revisit quarterly.
"""

from app.models.embeddings import EmbeddingModelId, EmbeddingUsage

PRICING: dict[EmbeddingModelId, float] = {
    "voyage-3": 0.06,
    "voyage-3-lite": 0.02,
}


def calculate_cost(model: EmbeddingModelId, usage: EmbeddingUsage) -> float:
    """USD cost of a single embedding call, rounded to 6 decimals."""
    return round(PRICING[model] * usage.input_tokens / 1_000_000, 6)
