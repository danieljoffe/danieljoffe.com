"""Model pricing and cost calculation.

Prices are USD per million tokens. Kept here as static constants rather
than fetching from an API — the values change rarely, and a wrong value
is visible the next time we review spend.

Prompt caching rates follow Anthropic's standard: cache writes cost 1.25x
the base input rate, cache reads cost 0.1x. If this ratio changes, update
the multipliers in `ModelPricing`.

Source: Anthropic pricing page as of 2026-04. Revisit quarterly.
"""

from pydantic import BaseModel

from app.models.llm import LLMUsage, ModelId


class ModelPricing(BaseModel):
    """USD per million tokens."""

    input: float
    output: float

    @property
    def cache_read(self) -> float:
        return self.input * 0.1

    @property
    def cache_write(self) -> float:
        return self.input * 1.25


PRICING: dict[ModelId, ModelPricing] = {
    "claude-opus-4-7": ModelPricing(input=15.00, output=75.00),
    "claude-sonnet-4-6": ModelPricing(input=3.00, output=15.00),
    "claude-haiku-4-5": ModelPricing(input=0.80, output=4.00),
}


def calculate_cost(model: ModelId, usage: LLMUsage) -> float:
    """Total USD cost of a single call, rounded to 6 decimals."""
    p = PRICING[model]
    total_per_mtok = (
        p.input * usage.input_tokens
        + p.output * usage.output_tokens
        + p.cache_read * usage.cache_read_input_tokens
        + p.cache_write * usage.cache_creation_input_tokens
    )
    return round(total_per_mtok / 1_000_000, 6)
