"""MockEmbeddingsClient behavior."""

from app.services.embeddings.mock import DIMENSIONS, MockEmbeddingsClient


async def test_returns_one_vector_per_input() -> None:
    client = MockEmbeddingsClient()
    result = await client.embed(
        model="voyage-3",
        inputs=["a", "b", "c"],
        purpose="t",
    )
    assert len(result.embeddings) == 3


async def test_vector_dimension_matches_model() -> None:
    client = MockEmbeddingsClient()
    for model in ("voyage-3", "voyage-3-lite"):
        result = await client.embed(model=model, inputs=["hello"], purpose="t")
        assert len(result.embeddings[0]) == DIMENSIONS[model]


async def test_vectors_are_in_range() -> None:
    client = MockEmbeddingsClient()
    result = await client.embed(model="voyage-3", inputs=["abc"], purpose="t")
    assert all(-1 <= v <= 1 for v in result.embeddings[0])


async def test_same_input_yields_same_vector() -> None:
    client = MockEmbeddingsClient()
    a = await client.embed(model="voyage-3", inputs=["fixed"], purpose="t")
    b = await client.embed(model="voyage-3", inputs=["fixed"], purpose="t")
    assert a.embeddings == b.embeddings


async def test_different_inputs_yield_different_vectors() -> None:
    client = MockEmbeddingsClient()
    result = await client.embed(model="voyage-3", inputs=["x", "y"], purpose="t")
    assert result.embeddings[0] != result.embeddings[1]


async def test_empty_inputs_returns_empty_embeddings_and_zero_cost() -> None:
    client = MockEmbeddingsClient()
    result = await client.embed(model="voyage-3", inputs=[], purpose="t")
    assert result.embeddings == []
    assert result.usage.input_tokens == 0
    assert result.cost_usd == 0.0


async def test_usage_and_cost_are_nonzero_for_real_input() -> None:
    # Voyage-3 is $0.06/MTok — need a few hundred tokens to round above zero
    # at six decimals. Use a payload representative of a real chunk.
    client = MockEmbeddingsClient()
    long_input = "Senior frontend engineer. " * 200
    result = await client.embed(model="voyage-3", inputs=[long_input], purpose="t")
    assert result.usage.input_tokens > 0
    assert result.cost_usd > 0


async def test_call_is_tracked() -> None:
    client = MockEmbeddingsClient()
    await client.embed(model="voyage-3", inputs=["a", "b"], purpose="tracked")
    assert client.calls == [
        {"model": "voyage-3", "purpose": "tracked", "input_count": 2},
    ]
