"""Validate the OpenRouter key + each candidate model in one cheap pass.

Run before the multi_model_judge harness — confirms the key works,
each model is reachable, and each model returns parseable JSON for the
Phase 2 grading shape.

Usage:
    cd apps/wyrdfold-api
    zsh -c 'source ~/.zshrc && uv run python scripts/openrouter_smoke.py'

Or, if your env already has OPEN_ROUTER_API_KEY:
    uv run python scripts/openrouter_smoke.py
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

# Make ``scripts._openrouter`` importable when running from the package root.
sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts._openrouter import MODELS, call_model, get_api_key

_TINY_SYSTEM = """\
You are a JSON-only responder. Reply with a single JSON object.
Schema: {"ok": true, "model_self_id": "<one short string the model uses to identify itself>"}
No prose, no markdown, no code fences."""

_TINY_USER = "Confirm you can respond with the schema above."


async def main() -> int:
    api_key = get_api_key()
    print(f"OPEN_ROUTER_API_KEY loaded ({api_key[:14]}…).\n")

    failures: list[str] = []
    total_cost = 0.0

    for short, slug in MODELS.items():
        print(f"  → {short:15s}  ({slug}) ... ", end="", flush=True)
        result = await call_model(
            model_slug=slug,
            system=_TINY_SYSTEM,
            user=_TINY_USER,
            api_key=api_key,
            # 512 — Gemini emits ~50 prose tokens before the JSON; GPT-5
            # reasoning models burn tokens on hidden reasoning before
            # producing visible output. 128 truncated both.
            max_tokens=512,
        )
        if result.error:
            print(f"FAIL [{result.error[:80]}]")
            failures.append(short)
            continue
        parsed = result.parsed
        if not parsed or parsed.get("ok") is not True:
            print(
                f"PARSE-FAIL [latency={result.latency_ms}ms, "
                f"raw={result.raw_content[:60]!r}]"
            )
            failures.append(short)
            continue
        total_cost += result.cost_usd
        print(
            f"ok [self={parsed.get('model_self_id', '?')!r:30s} "
            f"latency={result.latency_ms}ms cost=${result.cost_usd:.6f}]"
        )

    print(
        f"\nSmoke total cost: ${total_cost:.5f}  "
        f"({len(MODELS) - len(failures)}/{len(MODELS)} models healthy)"
    )
    if failures:
        print(f"FAILED: {', '.join(failures)}")
        return 1
    print("All models healthy. Safe to run multi_model_judge.py.")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
