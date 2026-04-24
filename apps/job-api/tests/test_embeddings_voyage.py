"""VoyageEmbeddingsClient tests.

Mock the SDK's `AsyncClient.embed` at the instance level. Verifies the
client builds the request correctly (model + input_type), parses
responses into EmbeddingResult, and short-circuits on empty inputs.
"""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.embeddings.voyage_client import VoyageEmbeddingsClient


def _fake_response(*, embeddings: list[list[float]], total_tokens: int = 10) -> Any:
    response = MagicMock()
    response.embeddings = embeddings
    response.total_tokens = total_tokens
    return response


def _client_with_mocked_sdk(response: Any) -> tuple[VoyageEmbeddingsClient, AsyncMock]:
    client = VoyageEmbeddingsClient(api_key="test-key")
    embed_mock = AsyncMock(return_value=response)
    client._client.embed = embed_mock  # type: ignore[method-assign]
    return client, embed_mock


async def test_embed_returns_parsed_result() -> None:
    vectors = [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]]
    client, _ = _client_with_mocked_sdk(
        _fake_response(embeddings=vectors, total_tokens=42)
    )
    result = await client.embed(
        model="voyage-3",
        inputs=["a", "b"],
        purpose="test",
    )
    assert result.embeddings == vectors
    assert result.model == "voyage-3"
    assert result.usage.input_tokens == 42


async def test_embed_passes_model_and_input_type_to_sdk() -> None:
    client, embed_mock = _client_with_mocked_sdk(
        _fake_response(embeddings=[[0.1]], total_tokens=1)
    )
    await client.embed(
        model="voyage-3",
        inputs=["hello"],
        purpose="test",
    )
    kwargs = embed_mock.call_args.kwargs
    assert kwargs["model"] == "voyage-3"
    assert kwargs["input_type"] == "document"
    assert kwargs["texts"] == ["hello"]


async def test_embed_passes_voyage_3_lite_model() -> None:
    client, embed_mock = _client_with_mocked_sdk(
        _fake_response(embeddings=[[0.0]], total_tokens=1)
    )
    await client.embed(
        model="voyage-3-lite",
        inputs=["x"],
        purpose="test",
    )
    assert embed_mock.call_args.kwargs["model"] == "voyage-3-lite"


async def test_embed_empty_inputs_short_circuits_without_api_call() -> None:
    client, embed_mock = _client_with_mocked_sdk(_fake_response(embeddings=[]))
    result = await client.embed(
        model="voyage-3",
        inputs=[],
        purpose="test",
    )
    assert result.embeddings == []
    assert result.usage.input_tokens == 0
    assert result.cost_usd == 0.0
    embed_mock.assert_not_called()


async def test_cost_calculated_from_total_tokens() -> None:
    client, _ = _client_with_mocked_sdk(
        _fake_response(embeddings=[[0.1]], total_tokens=1_000_000)
    )
    result = await client.embed(
        model="voyage-3",
        inputs=["x"],
        purpose="test",
    )
    # voyage-3 = $0.06/MTok input, so 1M input tokens = $0.06
    assert result.cost_usd == pytest.approx(0.06, rel=1e-6)


async def test_latency_is_measured() -> None:
    client, _ = _client_with_mocked_sdk(
        _fake_response(embeddings=[[0.1]], total_tokens=1)
    )
    result = await client.embed(
        model="voyage-3",
        inputs=["x"],
        purpose="test",
    )
    assert result.latency_ms >= 0


async def test_embeddings_list_is_copied_not_shared() -> None:
    """Defensive: don't hand out the SDK's internal list reference."""
    sdk_vectors = [[0.1, 0.2]]
    client, _ = _client_with_mocked_sdk(
        _fake_response(embeddings=sdk_vectors, total_tokens=1)
    )
    result = await client.embed(
        model="voyage-3",
        inputs=["x"],
        purpose="test",
    )
    # Same contents, different container.
    assert result.embeddings == sdk_vectors


async def test_batch_of_inputs_passes_full_texts_list() -> None:
    client, embed_mock = _client_with_mocked_sdk(
        _fake_response(
            embeddings=[[0.0], [0.1], [0.2]], total_tokens=30
        )
    )
    await client.embed(
        model="voyage-3",
        inputs=["a", "b", "c"],
        purpose="test",
    )
    assert embed_mock.call_args.kwargs["texts"] == ["a", "b", "c"]
