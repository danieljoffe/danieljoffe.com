# Implementation Plan: OpenRouter Migration & Targeted Model Swaps

**Author:** Claude (2026-06-03)
**Status:** Sequenced PR plan. Driven by findings from `plan-wyrdfold-openrouter-investigation.md` (PR #817) and the live multi-model judge eval (89 cases × 5 models, results in `apps/wyrdfold-api/scripts/eval_results/`).
**Tracking issue:** Created on PR open — see issue tracker.

## Goal

Cut WyrdFold's LLM spend by ~60% and gain provider-fallback resilience by:

1. Routing all LLM calls through OpenRouter behind a feature flag, with no behavior change on flip-day.
2. Migrating specific call sites to cheaper / better-fit models based on empirical eval data — not gut feel.
3. Establishing a recurring multi-model evaluation harness so future prompt changes can be measured before they ship.

Hard requirement: no quality cliff. Every swap is gated on the model's measured Spearman ρ against current production behavior (or a structurally-equivalent acceptance bar for non-rankable outputs like cover letters and target suggestions).

## Why now

- Daniel just ran out of Anthropic monthly credits — operational disruption.
- We just shipped four major scoring changes (Phase 1, Phase 2, recency, axis weights). The pipeline is stable. Cost is now the bottleneck.
- The multi-model judge eval is done (~$4 spend, 89 cases × 5 models). We have empirical evidence, not hypothesis.

## Findings recap (from the eval)

**Cost-per-call ladder vs Sonnet 4.6 baseline (89-case Phase 2 grading):**

| Model                     | $/call   | vs 4.6                 | ρ vs baseline | Latency p50 | Failures    |
| ------------------------- | -------- | ---------------------- | ------------- | ----------- | ----------- |
| DeepSeek V3.2             | $0.00042 | **27× cheaper**        | 0.813         | 14.9s       | 2/89        |
| GPT-5.1                   | $0.00358 | **3.2× cheaper**       | 0.905         | **3.2s**    | 0/89        |
| Sonnet 4.5                | $0.01057 | 8% cheaper             | 0.887         | 6.3s        | 0/89        |
| **Sonnet 4.6** (baseline) | $0.01146 | 1×                     | 0.963 (self)  | 8.1s        | 0/89        |
| Gemini 2.5 Pro            | $0.02110 | 84% **more expensive** | 0.935         | 44.1s       | 21/89 (24%) |

**Key takeaways:**

- **GPT-5.1** is the strongest drop-in candidate for high-volume calls — 3× cheaper, 2.5× faster, ρ=0.905, 100% structured output. Grades 33% higher on average (more generous).
- **DeepSeek V3.2** at 27× cheaper is a great fit for **binary triage** (Phase 1) — its compressed dynamic range (top–middle gap = ~5 points) is exactly the right shape for "is this on topic?" but the wrong shape for fine-grained Phase 2 ranking.
- **Gemini 2.5 Pro** is unusable for this prompt shape — 84% more expensive, 24% parse-failure rate from verbose-reasoning truncation. Would require a fundamentally different prompt to be viable.
- **Sonnet 4.5** doesn't justify the swap — 8% cheaper but ρ=0.887 means real ranking disagreement.

**Disagreement cluster identified.** 8 of the top-10 highest-spread cases are director-tier CX/Ops roles. GPT-5.1 is generous (78–88), Sonnet 4.6 moderate (62–72), DeepSeek strict (35–46). This is a stable judgment-calibration difference, not noise. Human judgment call on which calibration matches "what counts as a lead."

## Architecture: wrap, don't replace

The Anthropic SDK is already abstracted behind `LLMClient` (Protocol in `app/services/llm/client.py`). The right move is **a second LLMClient implementation** that talks to OpenRouter, selected via `LLM_PROVIDER` env var.

```
app/services/llm/
  client.py             # Protocol — unchanged
  anthropic_client.py   # Existing — unchanged
  openrouter_client.py  # NEW — wraps httpx, OpenAI-compatible /chat/completions
  mock.py               # Existing — unchanged
  __init__.py           # branches get_llm_client() on settings.llm_provider
```

OpenRouter's `/chat/completions` endpoint is OpenAI-compatible. We use httpx directly (already a dep) rather than adding the `openai` SDK — keeps the surface small.

**Anthropic prompt-cache pass-through.** OpenRouter passes Anthropic's `cache_control: ephemeral` blocks through unchanged. Our existing `cache_system=True` flow works — but only on prompts that hit the 2048-token Sonnet cache threshold. The logistics addendum from PR #818 pushes the Phase 2 prompt over that threshold (free upside when flipped on).

**ZDR (Zero Data Retention)**: enabled account-wide via OpenRouter dashboard, not per-request. Documented in the integration PR.

## Sequenced PRs

Each PR independently reviewable. Numbered acceptance criteria spell out the empirical bar that must be met before merging.

### A. OpenRouter client + provider flag (smallest-first-PR)

- New file `app/services/llm/openrouter_client.py` — implements `LLMClient` Protocol via httpx against `https://openrouter.ai/api/v1/chat/completions`.
- `app/config.py`: extend `LLM_PROVIDER` literal to include `"openrouter"`; add `openrouter_api_key`, `openrouter_timeout_seconds`, `openrouter_max_retries` settings.
- `app/services/llm/__init__.py`: branch `get_llm_client()` on the provider value.
- `scripts/openrouter_smoke.py` (already exists, locally): one-shot validation. Move from local-only to committed.
- ZDR enabled account-wide (operator action, documented in PR description).
- Default: `LLM_PROVIDER=anthropic` — zero behavior change.

**Acceptance criteria:**

- All existing unit tests still pass with `LLM_PROVIDER=anthropic`.
- Smoke script reports 5/5 models healthy.
- After merge: flip `LLM_PROVIDER=openrouter` in staging, watch `llm_costs` for 24h. Cost-per-call delta matches the eval data (within ±15%). If healthy, swap prod. If not, swap back via env var — zero code rollback.

**Risk:** Low. New code path, gated by flag.

### B. Provider fallback (Capability 2 from investigation)

- Extend `openrouter_client.py` to support OpenRouter's `models` list parameter for per-call fallback. When the primary provider (Anthropic) is rate-limited, OR automatically tries Bedrock / Vertex.
- Wire `relevance.title_triage`, `fit.job_fit`, and `tailor.resume` to pass the fallback list.

**Acceptance criteria:**

- Synthetic test: simulate a 429 from primary, confirm fallback path returns valid response.
- After merge: observe at least one production fallback event in `llm_costs` within a week (no manual intervention needed — happens when Anthropic rate-limits naturally).

**Risk:** Low. Additive; falls back to single-provider behavior if `models` not specified.

### C. Phase 1 title triage → DeepSeek V3.2

- Switch `relevance.title_triage` default model from Haiku 4.5 to `deepseek/deepseek-v3.2`.
- Run the existing triage eval against both models; require ≥95% agreement on promising/not-promising decision per case.

**Acceptance criteria:**

- Per-case binary agreement ≥95% on the existing triage fixture.
- Cost-per-batch reduces from ~$0.022 to ~$0.0008 (~27× cheaper).
- After merge: monitor `cost_logs` for purpose=`relevance.title_triage` for 1 week; verify cost drops as expected and no spike in user-visible regressions (no "I clicked into the app and there are zero jobs" reports).

**Risk:** Medium. Phase 1 gates which jobs reach Phase 2 — a calibration shift here propagates.

**Mitigation:** Per `feedback-prompt-change-shadow-run`: ship behind `USE_DEEPSEEK_TRIAGE` flag, shadow-run for 1 week before flipping.

### D. Cover letter → GPT-5.1

- Switch `tailor.cover_letter` default model from Sonnet 4.6 to `openai/gpt-5.1`.
- Quality is subjective; use human spot-check + a fixed LLM-as-judge to compare side-by-side outputs on 5–10 stored cover letters.

**Acceptance criteria:**

- Human spot-check (Daniel): 5 generations per model on identical (user × JD) inputs, blind-pick preferred output. GPT-5.1 wins ≥3/5 or ties.
- Cost-per-call reduces from ~$0.012 to ~$0.0036 (~3× cheaper).
- After merge: monitor user retry rate on cover letters; if it spikes vs baseline (users hate the output and regenerate), revert.

**Risk:** Low-medium. User-facing but subjective; easy to revert.

### E. Phase 2 (`relevance.job_fit`) — keep Sonnet 4.6 for now, instrument for A/B

- **Do not switch the default.** The 89-case eval showed GPT-5.1 is competitive but its 33% higher mean score would shift the visible distribution upward.
- **Instead:** add per-target override capability. A new env var `JOB_FIT_MODEL_OVERRIDES` accepts a JSON map `{target_id: model_slug}` so we can A/B specific targets without changing global behavior.
- Pick one volunteer target (Daniel's own?), flip to GPT-5.1, monitor downstream signals (user click-through, scores-vs-feedback agreement) for 2 weeks.

**Acceptance criteria:**

- Override mechanism in place; default behavior unchanged.
- A/B target identified; baseline metrics captured before flip.

**Risk:** Low. No swap actually happens at merge.

### F. Multi-model judge harness — productionize

- `scripts/multi_model_judge.py` lives locally today. Promote to committed script + add to CI as an optional workflow.
- Add `scripts/analyze_inflight.py` (already exists locally) — useful for mid-run snapshots.
- Document the canonical 5-model set + how to add/remove models when new versions ship.

**Acceptance criteria:**

- Re-running the harness against an unchanged prompt produces results within ±2% of the original on per-model means + ρ.
- Documented "when to re-run": any meaningful prompt edit (per the existing `feedback-prompt-change-shadow-run` memory).

**Risk:** None. Tooling-only PR.

### G. Target-suggestion eval harness

- New script `scripts/target_suggestion_judge.py`.
- Pulls 3–5 real user `OptimizedPayload`s from prod.
- Runs `suggest_targets` (and `suggest_lateral_targets`) on each through the 5 models.
- LLM-as-judge (held-fixed model: GPT-5.1 or Opus 4.7) grades each suggestion on coherence, relevance, diversity.
- Cross-model label-overlap metric.
- Human spot-check anchor (Daniel reads 2 outputs per user).

**Acceptance criteria:**

- Reproducible: re-run on same fixture produces results within ±5% on judge scores.
- Identifies a recommended swap (or confirms staying on Sonnet) for `suggest_targets`.
- Cost per full run: under $1.

**Risk:** None. New tooling, no production behavior change.

### H. Phase 2 logistics shadow-run (gates `LOGISTICS_EXTRACTION_ENABLED=true` flip)

- Already committed to in PR #818 description per `feedback-prompt-change-shadow-run`.
- Use the multi_model_judge harness against Sonnet 4.6 with and without the logistics addendum.
- Parity threshold: Spearman ρ ≥ 0.9 on axis-score correlation, both directions.

**Acceptance criteria:**

- Eval result committed to a follow-up doc.
- Once parity confirmed: flip `LOGISTICS_EXTRACTION_ENABLED=true` in production.
- Backfill `scores.logistics_filters` for historical rows via the existing `backfill_phase2_fit.py` (per the user's "test if archived jobs are graded" directive).

**Risk:** Medium. Touches live grader. Mitigation: hard parity threshold + ≥1 week shadow before flip.

## Eval coverage matrix

What we've measured vs. what's still on the to-do list:

| Call site                           | Volume                                                  | Eval status            | Next step                                                               |
| ----------------------------------- | ------------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------- |
| `relevance.job_fit` (Phase 2)       | High (per poll cycle × promising jobs × active targets) | ✅ 89 cases × 5 models | E above                                                                 |
| `relevance.title_triage` (Phase 1)  | Very high (per poll cycle × ALL ingested jobs)          | ❌                     | Run agreement-eval in PR C                                              |
| `tailor.cover_letter`               | Low (user action)                                       | ❌                     | LLM-judge eval in PR D                                                  |
| `tailor.resume`                     | Low (user action)                                       | ❌ qualitative only    | Defer — quality grade hard for creative output                          |
| `targets.suggest`                   | Medium (onboarding + ad-hoc)                            | ❌                     | New harness in PR G                                                     |
| `targets.suggest_lateral`           | Medium (user-triggered)                                 | ❌                     | Same harness as G                                                       |
| `targets.derive_profile_from_label` | Low-medium (per new target)                             | ❌                     | Defer to PR G follow-up; one-shot output is hard to grade automatically |
| `experience.derive` / `consolidate` | One-time per user                                       | ❌                     | Defer — extremely rare call, not a cost concern                         |
| Phase 2 + logistics addendum        | Same as Phase 2                                         | ❌ (planned)           | PR H                                                                    |

## Connection to other plans

- **`plan-wyrdfold-openrouter-investigation.md`** (merged PR #817) — the "why" research. This doc is the "how/when" execution plan.
- **`plan-wyrdfold-lateral-discovery-v2.md`** — PR G's harness will inform whether the reconciled prompt (lateral v2 PR C) needs a different default model.
- **`plan-wyrdfold-logistics-chips.md`** — PR H is the gating step for the logistics chips rollout.

## Out of scope (intentionally)

- **Switching tailor.resume model.** Too creative to grade; user-paid moment with low call volume. Revisit if cost becomes meaningful.
- **Gemini 2.5 Pro anywhere.** Eval-disqualified by 24% failure rate.
- **Multi-model ensemble in production** (e.g., "grade with 3 models, take median"). Future work — adds latency and complexity, not yet justified.
- **Embeddings / rerank via OpenRouter.** We dropped cosine prefilter recently; not revisiting until product need surfaces.
- **EU data residency.** OpenRouter supports it on Enterprise plans. Not relevant yet.

## Rollout strategy

1. PR A merges → staging gets OR for 24h → prod flip if healthy.
2. PR B merges with A; provider fallback is free once OR is on.
3. PR C, D run in parallel after A is in prod for a week. Each flag-gated, shadow-run per the feedback memory.
4. PR E, F, G, H ship in any order — they're independent.
5. Total estimated savings on full rollout: ~$325/mo (~60%), per investigation Doc.

## Success metrics

Measured after PR D is live for 30 days:

- **Cost reduction**: monthly `llm_costs` sum drops by ≥40% (the investigation's $325/mo target accounting for usage growth).
- **No quality regression**: user-reported "wrong score" / "no jobs visible" complaints don't spike vs baseline month.
- **Provider resilience**: at least one OpenRouter fallback event observed in `llm_costs` without manual intervention.
