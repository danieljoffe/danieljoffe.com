"""Voyage embedding pricing."""

import pytest

from app.models.embeddings import EmbeddingUsage
from app.services.embeddings.pricing import PRICING, calculate_cost


def test_pricing_defined_for_targeted_models() -> None:
    for model in ("voyage-3", "voyage-3-lite"):
        assert model in PRICING


def test_voyage_3_input_cost() -> None:
    cost = calculate_cost("voyage-3", EmbeddingUsage(input_tokens=1_000_000))
    assert cost == pytest.approx(0.06, rel=1e-6)


def test_voyage_3_lite_cheaper_than_voyage_3() -> None:
    usage = EmbeddingUsage(input_tokens=10_000)
    assert calculate_cost("voyage-3-lite", usage) < calculate_cost("voyage-3", usage)


def test_zero_tokens_costs_nothing() -> None:
    assert calculate_cost("voyage-3", EmbeddingUsage(input_tokens=0)) == 0.0


def test_result_rounded_to_six_decimals() -> None:
    cost = calculate_cost("voyage-3", EmbeddingUsage(input_tokens=37))
    assert cost == round(cost, 6)
