# Anthropic API

## What it does in this app

- **Claude Sonnet 4.6** — heavy reasoning: resume tailoring (`tailor.py`), prose → optimized projection (`derive.py`), prose consolidation (`consolidate.py`), semantic resume merge on upload (`merge.py`), target profile derivation, ATS lint
- **Claude Haiku 4.5** — latency-sensitive: conversation turns (`orchestrator.py`), gap probes
- All calls flow through `app/services/llm/client.py` (Protocol) with a Mock/Anthropic split. Production uses `AnthropicLLMClient` in `apps/job-api/app/services/llm/anthropic_client.py:29`

## Get an API key

1. Sign in at https://console.anthropic.com
2. Settings → API Keys → **Create Key**
3. Name it `fitted-job-api-local` (or `-prod` for the deployed key)
4. Workspace: pick the one that has billing attached
5. Copy the `sk-ant-…` value — shown once, never again

**Plan/tier matters:** prompt caching (`cache_system=True` in our code) requires the standard tier. Long-context (Sonnet 4.6 is 1M tokens) is enabled by default for paid accounts.

## Env vars

In `apps/job-api/.env`:

```env
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_TIMEOUT_SECONDS=600     # default 600s; long for derive on large prose
ANTHROPIC_MAX_RETRIES=2           # default 2
```

Leave `LLM_PROVIDER=mock` (the default) if you want offline dev. The mock client returns deterministic JSON and writes realistic-looking cost-log rows.

## Validate the key

Quick curl:

```bash
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-haiku-4-5-20251001","max_tokens":32,"messages":[{"role":"user","content":"ping"}]}'
```

A 200 with `{"content":[{"type":"text","text":"..."}]}` means the key is good. A 401 means wrong key, 429 means rate-limited, 400 with `model` error means your account doesn't have access to that model id.

End-to-end via the app:

```bash
curl -X POST http://localhost:8001/experience/derive \
  -H "x-api-key: $JOB_API_KEY"
```

This requires a prose doc to exist; on success it writes a row to `llm_cost_log`.

## Cost / billing dashboard

- Spend & usage: https://console.anthropic.com/settings/usage
- Per-purpose cost in our DB: `select purpose, sum(cost_usd) from llm_cost_log group by 1 order by 2 desc;`
- Insights page surfaces this under "Skills + Cost"

`purpose` labels we emit (grep `cost_log.record` in `apps/job-api`):
`experience.derive`, `experience.ingest_merge`, `experience.prose_consolidate`, `tailor.resume`, `tailor.cover_letter`, `lint_ats`, `conversation.onboarding`, `conversation.update`, `gap_probe`, `targets.derive_profile`, `targets.fit_score`, `targets.suggest`, `targets.match`.

If you see a row with `purpose='unknown'` it's a code bug — every `complete()` call should pass a purpose.

## Where it's wired

- Client init: `apps/job-api/app/services/llm/anthropic_client.py:29`
- Provider switch: `apps/job-api/app/dependencies.py` (`get_llm_client`)
- Pricing table (used by mock + real for cost calc): `apps/job-api/app/services/llm/pricing.py`
- Markdown-fence stripping for Haiku JSON: `apps/job-api/app/services/llm/client.py:24`

## Common errors

| Symptom                                     | Cause                            | Fix                                                                      |
| ------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------ |
| `401 invalid_api_key`                       | wrong key, deleted key           | rotate in console, update `.env`, restart job-api                        |
| `429 rate_limit_error`                      | burst beyond tier                | space out calls; check Workspace tier                                    |
| `400 model not found`                       | typo or missing model access     | verify model id matches `app/models/llm.py::ModelId`                     |
| `EOF while parsing JSON`                    | output truncated by `max_tokens` | bump caller's `max_tokens`; we hit this on `derive` (now 16384)          |
| Bare "Internal Server Error" 502 from proxy | unhandled exception in handler   | global handler in `app/main.py` now returns JSON 500 with traceback hint |
| Hangs >5 min                                | Anthropic timeout                | check `ANTHROPIC_TIMEOUT_SECONDS`; default 600s is generous              |
