"""Cost calculation for the LLM pricing table."""

import pytest

from app.models.llm import LLMUsage
from app.services.llm.pricing import PRICING, calculate_cost


def test_pricing_defined_for_every_model() -> None:
    for model in ("claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5"):
        assert model in PRICING


def test_sonnet_input_only() -> None:
    cost = calculate_cost(
        "claude-sonnet-4-6",
        LLMUsage(input_tokens=1_000_000, output_tokens=0),
    )
    assert cost == pytest.approx(3.0, rel=1e-6)


def test_sonnet_output_only() -> None:
    cost = calculate_cost(
        "claude-sonnet-4-6",
        LLMUsage(input_tokens=0, output_tokens=1_000_000),
    )
    assert cost == pytest.approx(15.0, rel=1e-6)


def test_sonnet_mixed() -> None:
    cost = calculate_cost(
        "claude-sonnet-4-6",
        LLMUsage(input_tokens=2000, output_tokens=500),
    )
    expected = (3.0 * 2000 + 15.0 * 500) / 1_000_000
    assert cost == pytest.approx(expected, rel=1e-6)


def test_haiku_cheaper_than_sonnet_on_identical_usage() -> None:
    usage = LLMUsage(input_tokens=10_000, output_tokens=1_000)
    assert calculate_cost("claude-haiku-4-5", usage) < calculate_cost(
        "claude-sonnet-4-6", usage
    )


def test_cache_read_is_one_tenth_of_input() -> None:
    full_input = calculate_cost("claude-sonnet-4-6", LLMUsage(input_tokens=1_000_000))
    cache_read = calculate_cost(
        "claude-sonnet-4-6", LLMUsage(cache_read_input_tokens=1_000_000)
    )
    assert cache_read == pytest.approx(full_input * 0.1, rel=1e-6)


def test_cache_write_is_1_25x_of_input() -> None:
    full_input = calculate_cost("claude-sonnet-4-6", LLMUsage(input_tokens=1_000_000))
    cache_write = calculate_cost(
        "claude-sonnet-4-6", LLMUsage(cache_creation_input_tokens=1_000_000)
    )
    assert cache_write == pytest.approx(full_input * 1.25, rel=1e-6)


def test_zero_usage_costs_nothing() -> None:
    assert calculate_cost("claude-opus-4-7", LLMUsage()) == 0.0


def test_result_rounded_to_six_decimals() -> None:
    cost = calculate_cost("claude-haiku-4-5", LLMUsage(input_tokens=37))
    assert cost == round(cost, 6)
