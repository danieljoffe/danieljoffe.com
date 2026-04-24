"""Embeddings module.

The `EmbeddingsClient` Protocol has two implementations:

- `MockEmbeddingsClient` — deterministic fake for tests and local dev.
- `VoyageEmbeddingsClient` — production, uses the official `voyageai` SDK.

`get_default_client()` picks based on `settings.embeddings_provider` (env
var `EMBEDDINGS_PROVIDER=mock|voyage`). Mock is the default so nothing
hits the real API unless opted in.
"""

from app.services.embeddings.client import EmbeddingsClient
from app.services.embeddings.mock import MockEmbeddingsClient
from app.services.embeddings.voyage_client import VoyageEmbeddingsClient

__all__ = [
    "EmbeddingsClient",
    "MockEmbeddingsClient",
    "VoyageEmbeddingsClient",
    "get_default_client",
]


def get_default_client() -> EmbeddingsClient:
    """Return the configured embeddings client.

    Reads `settings.embeddings_provider`. `"voyage"` requires
    `VOYAGE_API_KEY` (via env or `voyage_api_key` setting); anything
    else falls back to the mock.
    """
    from app.config import settings

    if settings.embeddings_provider == "voyage":
        return VoyageEmbeddingsClient(
            api_key=settings.voyage_api_key or None,
            timeout=settings.voyage_timeout_seconds,
            max_retries=settings.voyage_max_retries,
        )
    return MockEmbeddingsClient()
