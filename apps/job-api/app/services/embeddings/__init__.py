"""Embeddings module (#185 P2b).

Mock-only for now. Real Voyage-backed client is a later phase — the
Protocol interface makes that swap a constructor change at the call site.
"""

from app.services.embeddings.client import EmbeddingsClient
from app.services.embeddings.mock import MockEmbeddingsClient

__all__ = ["EmbeddingsClient", "MockEmbeddingsClient", "get_default_client"]


def get_default_client() -> EmbeddingsClient:
    """Default factory. Returns a MockEmbeddingsClient today; will read
    an EMBEDDING_PROVIDER env var when the real Voyage client lands.
    """
    return MockEmbeddingsClient()
