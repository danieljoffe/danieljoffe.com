# Investigation: WyrdFold on OpenRouter — Cost Minimization + New Capabilities

**Status:** Research only. Doc this PR; no code changes.
**Date:** 2026-06-03
**Trigger:** Anthropic monthly credits exhausted mid-cycle. Piotr suggested OpenRouter as a unified front-door to many providers with one billing relationship and built-in fallback.

## Goal

Decide whether (and how) to put OpenRouter in front of our LLM calls. Two angles:

1. **Cost minimization** — same pipeline, cheaper bill via cheaper providers, better caching, or routed-by-price.
2. **New capabilities** — things that are hard today because we're single-provider on the Anthropic SDK.

Output is a single follow-up PR proposal sized so we ship the integration in one safe step and decide on broader migration after we see real numbers.

## Why now

- Out of credits this month. Anthropic-direct gives one billing knob and zero failover when rate-limited. We already had to bump `anthropic_max_retries` from 2 → 5 to absorb Phase 2 backfill bursts (see `apps/wyrdfold-api/app/config.py:65-72`).
- We just finished the Phase 1 (Haiku triage) + Phase 2 (Sonnet grading) migration. The cost shape of the system is finally stable enough to _price_ a migration intelligently.
- The `LLMClient` Protocol (`apps/wyrdfold-api/app/services/llm/client.py`) was explicitly designed so a second provider can be slotted in via env switch — that bet has been sitting unused for months. This is the moment to call it in.

## TL;DR

- **No per-call markup.** OpenRouter charges a **5.5% fee on credit top-ups** ($0.80 min) and then **passes through provider pricing** ([FAQ](https://openrouter.ai/docs/faq)). Net effect for us is essentially "Anthropic + ~5.5%" if we stay on Claude, far less than I assumed.
- **Anthropic prompt caching passes through verbatim** — same `cache_control: {"type": "ephemeral"}` block we use today, same 0.1x read / 1.25x write rates ([Prompt Caching docs](https://openrouter.ai/docs/features/prompt-caching)). Our existing caching plumbing in `anthropic_client.py` survives unchanged at the wire level.
- **Drop-in via Anthropic SDK base_url override.** OpenRouter exposes an Anthropic-Messages-compatible endpoint, so we don't need to rip out `AsyncAnthropic`. Smallest first PR can be a one-line env-driven base URL switch + a new `LLM_PROVIDER=openrouter` enum value.
- **Biggest cost win isn't switching providers — it's right-sizing models.** Specifically: pushing `tailor.cover_letter` (currently Sonnet @ 4096 output cap) to Haiku, and considering DeepSeek-V3 / Gemini Flash for `targets.suggest` and `experience.derive`. Provider-switch savings are 1.0x; model-switch savings are 5-15x.
- **Biggest new capability**: multi-model judge ensembles for relevance calibration. Today we have no cheap way to ask "would GPT-5 grade this job the same way as Sonnet?" — a one-shot OpenRouter call to N models gives us a calibration corpus for ~$1 total.

## Part 1 — Current LLM call inventory

Source files inspected: `apps/wyrdfold-api/app/services/`. Anthropic SDK is wrapped behind `AnthropicLLMClient` (`services/llm/anthropic_client.py`), selected by `settings.llm_provider == "anthropic"`. All call sites go through `complete_json` → `complete_tool_use` (forced single-tool call with Pydantic-derived input schema). Cost is logged per call into `llm_costs` (Supabase table) keyed by `purpose`.

### Call sites

| File                                   | `DEFAULT_PURPOSE`              | Model               | `max_tokens` | `cache_system` | Trigger                                                                                    | Approx volume                          |
| -------------------------------------- | ------------------------------ | ------------------- | ------------ | -------------- | ------------------------------------------------------------------------------------------ | -------------------------------------- |
| `relevance/title_triage.py`            | `relevance.title_triage`       | `claude-haiku-4-5`  | 8192         | yes (batched)  | every poller tick, per batch                                                               | ~1 call per ~250 candidate titles      |
| `fit/job_fit.py`                       | `relevance.job_fit`            | `claude-sonnet-4-6` | 4096         | yes            | per Phase 1-survivor job                                                                   | ~1 per surviving job per active target |
| `targets/suggest.py`                   | `target.suggest`               | `claude-sonnet-4-6` | 4096         | yes            | onboarding, user action                                                                    | ~1 per user per onboarding             |
| `targets/lateral_discovery.py`         | `target.lateral_suggest`       | `claude-sonnet-4-6` | 4096         | yes            | user clicks "discover lateral"                                                             | ~1 per user per session                |
| `targets/derive_profile.py`            | `target.derive`                | `claude-sonnet-4-6` | 4096         | yes            | per reference-JD attach                                                                    | rare; ~1 per user per target           |
| `targets/derive_profile_from_label.py` | `target.derive_from_label`     | `claude-sonnet-4-6` | 4096         | yes            | per lateral pick → activated                                                               | cached in `target_derivations` table   |
| `tailor/tailor.py` (resume)            | `tailor.resume`                | `claude-sonnet-4-6` | **8192**     | yes            | user clicks "tailor"                                                                       | ~1 per user action                     |
| `tailor/tailor.py` (cover letter)      | `tailor.cover_letter`          | `claude-sonnet-4-6` | 4096         | yes            | optional, alongside resume                                                                 | ~1 per user action                     |
| `tailor/pipeline.py`                   | (delegates to two above)       | —                   | —            | —              | wraps the two tailor calls                                                                 | —                                      |
| `experience/consolidate.py`            | `experience.prose_consolidate` | `claude-sonnet-4-6` | custom       | no             | onboarding / re-consolidation                                                              | ~1-2 per user per onboarding           |
| `experience/derive.py`                 | `experience.derive`            | `claude-sonnet-4-6` | custom       | no             | onboarding                                                                                 | ~1 per user per onboarding             |
| `analysis/analyze.py`                  | `job_analysis`                 | `claude-sonnet-4-6` | 4096         | yes            | (legacy; partially superseded by `fit/job_fit.py` per `plan-wyrdfold-job-fit-feedback.md`) | low                                    |
| `conversation/orchestrator.py`         | `conversation.*`               | `claude-sonnet-4-6` | 4096         | yes            | per chat turn                                                                              | per user-message in onboarding chat    |

Pricing constants (`services/llm/pricing.py`): Opus 4.7 $15/$75 per Mtok, Sonnet 4.6 $3/$15, Haiku 4.5 $0.80/$4.00. Cache reads at 0.1x input, cache writes at 1.25x.

### Approximate cost per call (typical)

These are order-of-magnitude estimates from the prompt shapes in each file; treat ±2x as the error bar until we pull real `llm_costs` aggregates.

| Purpose                          | Typical input toks | Typical output toks | $/call (no cache) | $/call (cache hit) |
| -------------------------------- | ------------------ | ------------------- | ----------------- | ------------------ |
| `relevance.title_triage` (batch) | ~12.5K             | ~3K                 | ~$0.022           | ~$0.014            |
| `relevance.job_fit`              | ~3.5K (JD trimmed) | ~1K                 | ~$0.026           | ~$0.012            |
| `target.suggest`                 | ~3K                | ~1.5K               | ~$0.032           | ~$0.018            |
| `target.lateral_suggest`         | ~3.5K              | ~2K                 | ~$0.041           | ~$0.024            |
| `target.derive` / `_from_label`  | ~4K                | ~2K                 | ~$0.042           | ~$0.024            |
| `tailor.resume`                  | ~6K                | ~6K (8192 cap)      | ~$0.108           | ~$0.090            |
| `tailor.cover_letter`            | ~5K                | ~2K                 | ~$0.045           | ~$0.030            |
| `experience.derive`              | ~3K                | ~3K                 | ~$0.054           | n/a (no cache)     |
| `conversation.*` turn            | ~2K                | ~600                | ~$0.015           | ~$0.011            |

The **Phase 2 grade loop dominates** total spend in active operation (one Sonnet call per surviving job per active target, polling on a continuous cadence). Per `plan-wyrdfold-job-fit-feedback.md`, the system grades hundreds of jobs across 3 active targets nightly. At ~$0.012/cached-call \* ~1500 jobs/day ≈ **$18/day = ~$540/mo just for Phase 2**, before any user-triggered tailoring.

`tailor.resume` is the second tier: $0.10/call, hit per user action, hard cap of 8192 output tokens.

## Part 2 — OpenRouter today

All facts below are from openrouter.ai docs fetched on 2026-06-03 and cited inline.

### Pricing model

- **Pass-through provider pricing**, no per-call markup ([FAQ — Pricing and Fees](https://openrouter.ai/docs/faq)).
- **5.5% credit-purchase fee** ($0.80 minimum) on top-up. 5% on crypto. Effectively a tax on deposits, not on inference.
- BYOK (bring your own Anthropic key) is supported — first 1M BYOK requests/month free, then 5% of equivalent OpenRouter cost. Not relevant short-term (we'd use OpenRouter's pooled credits), but useful when we want to keep an Anthropic relationship long-term.

### API surface

- **OpenAI-compatible Chat Completions** is the canonical surface; works with the OpenAI SDK pointed at `https://openrouter.ai/api/v1`.
- **Anthropic Messages-compatible endpoint** exists (see "Anthropic Messages" section in the [API reference](https://openrouter.ai/docs/api/reference/overview)). This is the path of least resistance for us: keep `AsyncAnthropic`, change `base_url` and `api_key`.
- **Responses API** also supported with caveat that explicit-per-block prompt caching is Messages-API only.

### Prompt caching

This is where I had the framing wrong. Caching **does pass through** for the providers that support it ([Prompt Caching docs](https://openrouter.ai/docs/features/prompt-caching)):

- **Anthropic Claude:** automatic caching (top-level `cache_control`) **and** explicit per-block `cache_control: {"type": "ephemeral"}`. 5-min TTL at 1.25x write / 0.1x read — **identical to what our `AnthropicLLMClient` already sends**. 1-hour TTL also available at 2x write. Automatic caching is Anthropic-direct only (Bedrock/Vertex don't support top-level cache_control; explicit per-block works everywhere).
- **OpenAI:** automatic, no opt-in needed.
- **Google Gemini:** implicit + explicit cache breakpoints supported.
- **DeepSeek:** automatic.
- **Alibaba Qwen / DeepSeek V3.2:** explicit cache breakpoints with the same `cache_control: ephemeral` syntax as Anthropic.

For us: **the caching wire format does not change** when we move from Anthropic-direct to OpenRouter-routed-to-Anthropic. The `anthropic_client.py` implementation is already correct.

### Structured outputs / tool calling

- **Structured outputs** via `response_format: {type: "json_schema", json_schema: {...}}` ([Structured Outputs docs](https://openrouter.ai/docs/features/structured-outputs)). Supported on OpenAI GPT-4o+, Anthropic Sonnet 4.5/Opus 4.1+, Google Gemini, most OSS, all Fireworks-hosted models.
- **Strict tool use** on Claude requires the `structured-outputs-2025-11-13` beta header; OpenRouter automatically applies it for `response_format.type: "json_schema"` but **not** for `strict: true` on tools.
- Our current pattern is `complete_tool_use` (forced single tool with input schema). That is the **Anthropic tool-use shape**. On OpenRouter, we have two paths:
  1. **Anthropic Messages endpoint** — same shape, no translation needed.
  2. **Chat Completions endpoint** — translate to OpenAI-style `tools: [{type: "function", function: {...}}]` with `tool_choice: {type: "function", function: {name: ...}}`. Works across providers but requires a small adapter.

### Provider / model routing

Powerful ([Provider Routing docs](https://openrouter.ai/docs/features/provider-routing)):

- `order: ["anthropic", "bedrock"]` — try providers in order.
- `allow_fallbacks: true` (default) — fall through to other providers automatically when primary is down or rate-limited.
- `sort: "price" | "throughput" | "latency"` (or `"price"` aka `:floor` shortcut, `"throughput"` aka `:nitro`).
- `only` / `ignore` lists.
- `max_price: {prompt: ..., completion: ...}` — hard cost ceiling per request.
- `data_collection: "deny"` — only providers that don't store data.
- `zdr: true` — Zero Data Retention enforcement (Anthropic, OpenAI, Google all have ZDR endpoints).
- Top-level **`models: ["primary", "fallback1", "fallback2"]`** array gives explicit model-level fallback if primary returns an error or rate-limits.

There's also an **Auto Router** that lets OpenRouter pick a model per request based on a category prompt (e.g., classification vs. reasoning), and a **Pareto Router** for cost/quality optimization. Not something I'd reach for first — we want predictability.

### Rate limits

- Pooled globally per account, not per-key ([Rate Limits docs](https://openrouter.ai/docs/api-reference/limits)).
- `GET /api/v1/key` returns `limit`, `limit_remaining`, `usage` — gives us a programmatic budget guard we don't currently have on Anthropic-direct.
- Free models: 50 req/day account-wide if no credits, 1000 req/day if ≥$10 credits purchased.

### Model catalog highlights (as of 2026-06-03)

Couldn't get the catalog page to render through the doc fetcher, but the relevant model families I'll reference below are all listed on `openrouter.ai/models`:

- Anthropic: Claude Opus 4.7, Sonnet 4.7/4.6, Haiku 4.5
- OpenAI: GPT-5, GPT-5-mini, GPT-4o
- Google: Gemini 2.5 Pro (1M ctx), Gemini 2.5 Flash, Gemini Flash 2.5 (cheap)
- DeepSeek: V3.2, V3, R1 (reasoning), R1-Distill (free tier)
- Meta: Llama 3.3 70B (free tier on multiple providers)
- Alibaba Qwen: Qwen3-Max, Qwen3-Coder-Plus
- Mistral: Codestral, Mistral Large
- xAI: Grok 4

## Part 3 — Cost-optimization opportunities

Recommendations are ranked from highest-confidence to most-experimental. All $/month numbers assume current load (~1500 graded jobs/day, ~10-20 tailor invocations/week, ~5 onboarding/lateral flows/week — adjust if traffic changes meaningfully).

### Recommendation A — Move `tailor.cover_letter` from Sonnet to Haiku

- **Current:** ~$0.045/call × ~20/wk ≈ **$3.60/mo**.
- **Proposed:** Haiku 4.5 at $0.80/$4 vs $3/$15. Same prompt fits Haiku's window. Estimated **$0.012/call ≈ $0.96/mo**. Savings: ~73%.
- **Risk:** Cover letters are prose-heavy; Haiku will be a touch less fluid than Sonnet. Mitigation: A/B by routing 50% via OpenRouter `models: ["claude-haiku-4-5", "claude-sonnet-4-6"]` for two weeks, eyeball read 20 cover letters from each, decide.
- **Implementation:** Trivial — change `DEFAULT_MODEL` in `tailor/tailor.py` for the cover-letter path. Doable without OpenRouter, but OpenRouter A/B makes the comparison easier.

### Recommendation B — Move `targets.suggest` and `targets.lateral_suggest` to DeepSeek V3 or Gemini Flash

- **Current:** Sonnet @ ~$0.04/call. Probably ~$1-2/mo combined at current volume, but this is the call we'd most like to make ~free if we ever want to surface "more like this" exploration.
- **Proposed:** DeepSeek V3 (~$0.27 in, $1.10 out per Mtok) or Gemini Flash 2.5 (~$0.30 in, $2.50 out). Both ~10x cheaper than Sonnet on input.
- **Risk:** Suggestion quality is taste-shaped — could feel meaningfully worse. This is a Suggest-3-Things prompt with no ground truth.
- **Implementation:** OpenRouter unlocks this trivially. Set `model: "deepseek/deepseek-v3.2"` for one call site. If it's noticeably worse, revert by changing one constant.

### Recommendation C — Cap `tailor.resume` output

- **Current:** `max_tokens=8192` (`tailor/tailor.py:172`). At Sonnet output $15/Mtok, full-fill is **$0.123/call just for output**.
- **Question:** Are we actually using 8192 tokens of output? Resumes tend to be 1500-3500 tokens. If the median real output is ~2500 tokens, the cap is fine (output is metered actual, not capped). But it's worth instrumenting — pull a week of `llm_costs` rows for `tailor.resume` and look at the `output_tokens` distribution. If p95 < 4000, drop the cap to 4096 and remove the upper-bound on resumes that wouldn't have used it anyway. The cap protects worst-case spend.
- **Action:** Pure analysis — no code change yet. Add to the OpenRouter integration PR as a "while-we're-in-here" diagnostic.

### Recommendation D — Keep `relevance.title_triage` on Haiku, but check provider options

- **Current:** Haiku 4.5 @ ~$0.022/batch. Already cheap.
- **Don't switch.** This is a binary classification batch; Sonnet would be overkill, and a swap to GPT-4o-mini or DeepSeek would change the calibration of all downstream Phase 2 grades.
- **Win:** Add OpenRouter provider routing — if Anthropic Haiku is rate-limited, fall through to Bedrock Haiku (same model, different provider). Zero quality change, eliminates the "out of credits" failure mode.

### Recommendation E — Investigate Sonnet 4.7 vs 4.6 for `relevance.job_fit`

- **Current:** Sonnet 4.6 at ~$0.012/call (cache hit).
- **Question:** Is Sonnet 4.7 priced the same and meaningfully better for the four-axis grading task? Worth one A/B run.
- **Implementation:** Trivial via OpenRouter — flip a string. Pre-OpenRouter, we'd need to wait for Anthropic SDK + API support and re-test ourselves.

### Recommendation F — Prompt caching: more aggressive than today

Per `apps/wyrdfold-api/app/services/llm/anthropic_client.py` docstring: our current system prompts are **below the 4096-token threshold** for Opus/Haiku and the 2048-token threshold for Sonnet, so `cache_system=True` silently no-ops on the smaller prompts. Two concrete places to inflate the cached prefix so it actually triggers:

1. **`title_triage.py`**: pull the system prompt over the 2048-token Sonnet threshold by inlining the example block (currently externalized). Doesn't apply to current Haiku path (4096 threshold), but if we ever move triage to Sonnet, it does.
2. **`fit/job_fit.py`**: the system prompt is just over the threshold — verify with a token-count check; if it's marginal, lock it above 2048 deliberately. Cached input drops from $3 → $0.30 per Mtok which makes Phase 2 ~60% cheaper.

This is **not OpenRouter-dependent**, but the OpenRouter migration is a natural moment to audit it.

### Recommendation G — Provider routing as cost ceiling

For high-volume background tasks (Phase 1, Phase 2 backfill), set `max_price` so OpenRouter refuses to route the request if no provider is within budget. Caps blow-up scenarios where Anthropic raises prices or we're forced onto an expensive fallback.

### Estimated monthly savings summary

Assumes the current ~$540/mo Phase 2 dominates the bill, plus ~$50/mo of user-triggered tailoring + onboarding.

| Change                                        | $/mo before | $/mo after | Savings             |
| --------------------------------------------- | ----------- | ---------- | ------------------- |
| (A) Cover letter Sonnet → Haiku               | $3.60       | $0.96      | $2.64               |
| (B) Target suggest Sonnet → DeepSeek V3       | $2.00       | $0.20      | $1.80               |
| (E) Sonnet 4.6 → 4.7 (if same price, no save) | —           | —          | —                   |
| (F) Push job_fit prefix past cache threshold  | $540        | ~$220      | ~$320               |
| (D) Provider fallback (resilience, no $ save) | —           | —          | —                   |
| **Total recommended changes**                 | **~$545**   | **~$220**  | **~$325/mo (~60%)** |

The big number is **(F)**. It's the boring one — bigger cached prefix — and it doesn't even require OpenRouter. But OpenRouter is the forcing function: when we run the migration we have to re-verify caching works, which is when we'd notice the threshold issue.

## Part 4 — New capabilities OpenRouter unlocks

Scored: **Effort** (S/M/L), **Value** (low/med/high), **Requires-OpenRouter?** (yes / sort-of / no-but-easier).

### Capability 1 — Multi-model judge ensemble for Phase 2 calibration

Run the same `relevance.job_fit` prompt across Sonnet, GPT-5, and Gemini 2.5 Pro on a sample of 100 jobs. Flag rows where the three models disagree by >20 points on overall fit — those are the calibration edge cases worth re-examining.

- **Effort:** S (one-off script under `apps/wyrdfold-api/scripts/`).
- **Value:** **high.** We just did the Phase 2 migration and have no external check on whether Sonnet's verdicts are stable vs. arbitrary. This gives us one.
- **Requires-OpenRouter:** **yes** (single key, three providers).
- **Cost:** ~$1-2 for the whole calibration run.

### Capability 2 — Provider fallback for Anthropic rate-limit resilience

Wrap every call with `models: ["anthropic/claude-sonnet-4-6", "anthropic/claude-sonnet-4-6@bedrock", "anthropic/claude-sonnet-4-6@vertex"]`. Identical model, three providers. When Anthropic-direct rate-limits us mid-Phase-2-burst, we don't exhaust `anthropic_max_retries=5` — we just go to Bedrock.

- **Effort:** S (one config flag in the new client).
- **Value:** **high** — directly addresses the "out of credits / 429s" pain Daniel hit this month.
- **Requires-OpenRouter:** **yes.**

### Capability 3 — Long-context summarization with Gemini 2.5 Pro

Gemini 2.5 Pro has a 1M-token context window and Flash 2.5 is cheap. Use case: "summarize this user's entire job-search history (all `analyses`, all `jobs.fit_reasoning`, all `feedback`) into a 1-page insight". Today we'd have to chunk; with Gemini we'd one-shot.

- **Effort:** M (new service + prompt).
- **Value:** **medium** — neat insights surface, not core flow.
- **Requires-OpenRouter:** **sort-of** (we could go Google-direct, but OpenRouter spares us a second billing relationship).

### Capability 4 — Free-tier exploratory prompts

OpenRouter offers free models (Llama 3.3 70B, DeepSeek-R1, etc.) at 50 req/day (1000 if we've put $10 in). Perfect for:

- Generating synthetic JD variants for prompt evals.
- Internal "would this prompt work better phrased like X?" experiments.
- Author-time experimentation without spending real budget.

- **Effort:** S.
- **Value:** **medium** — speeds developer iteration; doesn't change user product.
- **Requires-OpenRouter:** **yes.**

### Capability 5 — Occasional Opus 4.7 for "deep dives"

Per `plan-wyrdfold-job-fit-feedback.md`, the "Phase 3 — deep-dive Opus" upgrade is a known future path. OpenRouter makes it a single string flip — no model-access provisioning, no separate billing.

- **Effort:** S (per call site that opts in).
- **Value:** **medium** — depends on whether we actually ship Phase 3.
- **Requires-OpenRouter:** **no-but-easier.**

### Capability 6 — Cheap calibration evals across N models

Every time we change a prompt, run it on 5 models (Sonnet 4.6, Sonnet 4.7, GPT-5, Gemini 2.5, DeepSeek V3) over 20 fixed inputs, diff the outputs into a markdown report, eyeball. Builds intuition for which prompt patterns are model-neutral vs. model-specific.

- **Effort:** M (build the harness once).
- **Value:** **medium-high** — prevents the "we tuned the prompt for Sonnet, then Sonnet 4.8 ships and it regresses" failure.
- **Requires-OpenRouter:** **yes.**

### Capability 7 — Embeddings via OpenRouter (deferred)

OpenRouter also reranks and (limited) embeds. We just dropped the cosine prefilter (per recent commit `9130b73a`), so embeddings aren't a current need. Note the option exists; revisit if we want a cheap-pre-Phase-1 filter.

- **Effort:** M.
- **Value:** **low (today)** — we explicitly walked away from this approach.
- **Requires-OpenRouter:** no.

### Capability ranking

| Capability                                   | Effort | Value | OR-required | Recommend now?     |
| -------------------------------------------- | ------ | ----- | ----------- | ------------------ |
| 2. Provider fallback for resilience          | S      | High  | Yes         | **Yes**            |
| 1. Multi-model judge for Phase 2 calibration | S      | High  | Yes         | **Yes**            |
| 4. Free-tier exploratory prompts (dev tool)  | S      | Med   | Yes         | Later              |
| 6. Cross-model prompt-eval harness           | M      | Med-H | Yes         | After 1 & 2        |
| 5. Opus 4.7 deep-dive path                   | S      | Med   | Easier      | When Phase 3 ships |
| 3. Long-context with Gemini 2.5 Pro          | M      | Med   | Easier      | Speculative        |
| 7. Embeddings / rerank                       | M      | Low   | No          | Skip               |

## Part 5 — Risk + migration assessment

### Architecture: wrap, don't replace

The Anthropic SDK is _already_ abstracted behind our `LLMClient` Protocol. The right move is:

1. **Add a third implementation**: `OpenRouterLLMClient` in `apps/wyrdfold-api/app/services/llm/openrouter_client.py`.
2. **Use the Anthropic Messages-compatible endpoint** on OpenRouter so most of the existing logic (system-prompt with `cache_control`, tool-use with `input_schema`, the same `LLMUsage` shape) ports near-verbatim. The simplest path is to **reuse `AsyncAnthropic`** with a different `base_url` and OpenRouter API key — under the hood it speaks the same protocol.
3. **Extend the `LLM_PROVIDER` literal**: `Literal["mock", "anthropic", "openrouter"]` in `app/config.py`.
4. **Don't change call sites** in Phase 1. All call sites keep their `DEFAULT_MODEL: ModelId = "claude-sonnet-4-6"` constants; the client maps that to OpenRouter's `anthropic/claude-sonnet-4-6` model slug.
5. **Cost-log compatibility**: `LLMResult.cost_usd` is computed by us from `usage` + `pricing.PRICING`. Need to verify that OpenRouter returns `cache_read_input_tokens` / `cache_creation_input_tokens` in the same response shape when using the Anthropic Messages endpoint. If yes, no change. If no (Chat Completions endpoint normalizes them away), we add per-purpose accounting from OpenRouter's `generation` records (separate API).

### Privacy / data residency

- **OpenRouter sits in the request path.** Prompts and completions transit OpenRouter's infrastructure on the way to the model provider. Today, prompts go Anthropic-direct.
- Add **one party** that sees prompts. For non-sensitive data (job descriptions, our system prompts) this is fine; for **user PII in `experience.derive`, `experience.consolidate`, `conversation.*`** (which can include resume content, names, emails) we want either:
  - `data_collection: "deny"` to route only to no-storage providers, **and / or**
  - `zdr: true` for Zero Data Retention enforcement ([ZDR docs](https://openrouter.ai/docs/features/zdr)). Anthropic, OpenAI, Google all have ZDR endpoints on OpenRouter.
- We should set ZDR account-wide via `openrouter.ai/settings/privacy` rather than per-request. Document this in the integration PR description.
- For the eventual EU residency question (not today): OpenRouter supports EU-only routing for Enterprise plans.

### Smallest-first-PR proposal

Single PR — **"add OpenRouter as a second LLM provider, off by default"**:

1. New file: `apps/wyrdfold-api/app/services/llm/openrouter_client.py`. Subclass / thin wrapper around `AsyncAnthropic` with `base_url=https://openrouter.ai/api/v1` and `api_key=settings.openrouter_api_key`. Maps our `ModelId` to OpenRouter slugs (`claude-sonnet-4-6` → `anthropic/claude-sonnet-4-6`).
2. `app/config.py`: extend `LLM_PROVIDER` literal to include `"openrouter"`; add `openrouter_api_key` and `openrouter_timeout_seconds` settings.
3. `app/services/llm/__init__.py`: branch `get_llm_client()` on the new provider value.
4. **One small script** (`scripts/openrouter_smoke.py`) that runs a single `complete_json` call against `relevance.job_fit` via OpenRouter on a known JD, prints the result + cost + cached tokens. Used to manually validate before flipping the env var in prod.
5. **Account-wide ZDR enabled** in OpenRouter dashboard (documented in PR description; not a code change).
6. No call-site changes. Cost-log columns unchanged.
7. After merge: flip `LLM_PROVIDER=openrouter` in one env (staging or local) and watch `llm_costs` for a day. If healthy, swap prod. If not, swap back — zero code rollback needed.

Estimated PR size: ~150-250 LOC, ~2 hours work, ~30 min to review.

**Follow-up PRs** (one each, all after PR #1 lands):

- Recommendation A: cover-letter Haiku swap (+A/B via `models: [...]`).
- Recommendation B: target-suggest DeepSeek/Flash A/B.
- Recommendation F: lift `fit/job_fit` system prompt over the cache threshold.
- Capability 1: write the multi-model judge script.
- Capability 2: enable provider fallback for Phase 2 calls.

## Open questions for Daniel

1. **Privacy posture**: comfortable enabling ZDR account-wide on OpenRouter and treating prompts as no-retention from day 1, or want to read OpenRouter's DPA first?
2. **Cost ceiling**: is ~$220/mo (post-recommendations) a comfortable steady state, or do we want a hard `max_price` cap below that?
3. **Cover letter quality bar**: if Haiku-tailored cover letters are "85% as good" as Sonnet, do we ship the cheaper version, or hold Sonnet because tailoring is a user-paid moment?
4. **Phase 1 dependency**: are we OK rolling OpenRouter integration to staging without `LLM_PROVIDER=openrouter` actually flipped in prod, so the code path bakes for a day before we cut over?
5. **Lateral discovery prompts**: open to running `target.lateral_suggest` on DeepSeek V3 cheaply, knowing the suggestions may feel "different" (not necessarily worse)?
6. **Sentinel calibration**: should the multi-model judge ensemble (Capability 1) run as a one-off this week, or land as a recurring weekly cron to catch silent drift?

## Out of scope

- Migrating off the Anthropic SDK entirely (`AsyncAnthropic`). The wrapper-as-base-URL approach lets us keep it.
- Changing the cost-log schema or `LLMUsage` shape.
- Switching `services/embeddings/` (Voyage) anywhere — embeddings stay Voyage-direct.
- Replacing Sentry, Supabase, Firecrawl, or any other non-LLM dependency.
- Building our own LLM gateway / proxy. OpenRouter is the gateway.
- Multi-region failover at the application layer — OpenRouter handles provider-level failover; we don't need to.

## Connection to other plans

- `plan-wyrdfold-job-fit-feedback.md`: Phase 3 "deep-dive Opus" path becomes trivial post-migration.
- `plan-wyrdfold-lateral-discovery-v2.md`: `target.lateral_suggest` and `target.derive_from_label` are both candidates for cheaper-model A/B once OpenRouter is in place. Section "Detailed shape > 2. target_derivations cache" already calls out the ~$0.012-per-miss cost; halving that with a model swap doubles cache ROI.
- `plan-wyrdfold-relevance-findings.md`: the four-axis calibration baseline established there is the comparison set for Capability 1 (multi-model judge ensemble).
