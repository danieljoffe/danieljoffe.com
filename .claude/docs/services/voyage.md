# Voyage AI

## What it does in this app

Embeds optimized-doc chunks (roles, skills, outcomes, summary) into vectors so we can semantically retrieve a user's most-relevant experience for a given job posting. Job postings get embedded too. Cosine similarity = the match score component.

- Model: `voyage-3-large` (1024-dim)
- Input type: `document` for both sides (we don't use query/document split)
- Stored in `resume_chunk_embeddings` and `job_posting_embeddings` (or equivalent — verify in migrations)

## Get an API key

1. Sign in at https://dash.voyageai.com
2. API Keys → **Create new secret key**
3. Copy the `pa-…` value

**Free tier** gives ~50M tokens/month, plenty for single-user dev. Pay-as-you-go above that.

## Env vars

In `apps/wyrdfold-api/.env`:

```env
EMBEDDINGS_PROVIDER=voyage
VOYAGE_API_KEY=pa-...
VOYAGE_TIMEOUT_SECONDS=60
VOYAGE_MAX_RETRIES=2
```

Default `EMBEDDINGS_PROVIDER=mock` returns deterministic random vectors — fine for testing the pipeline shape but matches will be nonsense.

## Validate the key

```bash
curl https://api.voyageai.com/v1/embeddings \
  -H "Authorization: Bearer $VOYAGE_API_KEY" \
  -H "content-type: application/json" \
  -d '{"input":["test"],"model":"voyage-3-large","input_type":"document"}'
```

A 200 with a 1024-element `embedding` array means it's working.

End-to-end: upload a resume with `?auto_derive=true` — `chunks.upsert_for_optimized` will write embedding rows for every role/skill/outcome/summary chunk.

## Cost / billing dashboard

- Voyage usage: https://dash.voyageai.com/usage
- In our DB: `select purpose, sum(cost_usd) from llm_cost_log where model like 'voyage-%' group by 1;`
- Embeddings cost is logged via `cost_log.record_embedding(...)` (separate from LLM `record(...)`)

Purposes we emit: `embeddings.optimized_chunks`, `embeddings.job_posting`, `embeddings.tailor_query` (grep `record_embedding` to confirm current set).

## Where it's wired

- Client init: `apps/wyrdfold-api/app/services/embeddings/voyage_client.py:29`
- Provider switch: `apps/wyrdfold-api/app/dependencies.py` (`get_embeddings_client`)
- Chunk embed pipeline: `apps/wyrdfold-api/app/services/experience/chunks.py`

## Common errors

| Symptom                 | Cause                                      | Fix                                                                                    |
| ----------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------- |
| `401`                   | wrong key                                  | rotate, update `.env`, restart                                                         |
| `429`                   | burst — Voyage has request-per-minute caps | back off; consider batching `input` arrays                                             |
| Empty `embedding` array | input too long                             | chunk before embedding (we already do this for prose; check limits for new code paths) |
| All matches score ~0.5  | provider is still `mock`                   | check `EMBEDDINGS_PROVIDER` actually got read by the running process                   |
| Mismatched dimensions   | model swap (was 3-lite, now 3-large)       | re-embed all rows; the dim is hard-coded in the column type — may need a migration     |
