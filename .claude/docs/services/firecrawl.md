# Firecrawl

## What it does in this app

Crawls JS-rendered careers pages that don't expose a clean ATS API. Used as the fallback path in the poller when a company isn't on Greenhouse / Lever / Workday / Ashby / SmartRecruiters but still wants their roles surfaced.

- Crawls a single careers URL, asks Firecrawl's LLM extraction to return a JSON array of jobs (title, location, department, url, description)
- Each crawled job gets a synthetic `external_id = sha256(careers_url|title|location)[:16]` so dedup still works
- The poller treats crawled rows like ATS rows — same `job_postings` schema, same scoring, same alerting

## Get an API key

1. Sign in at https://www.firecrawl.dev/app
2. Settings → **API Keys** → **Create API key**
3. Copy the `fc-…` value

**Free tier**: 500 credits/month. Each scrape with LLM extraction costs ~5 credits. Plenty for a few dozen low-traffic crawl sources at the daily poll cadence.

## Env vars

In `apps/job-api/.env`:

```env
FIRECRAWL_API_KEY=fc-...
```

If unset, `fetch_firecrawl_jobs()` logs a warning and returns `[]` — the poller continues with whatever ATS sources it does have.

## Validate the key

```bash
curl https://api.firecrawl.dev/v2/scrape \
  -H "Authorization: Bearer $FIRECRAWL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","formats":["markdown"]}'
```

A 200 with a `data.markdown` string means the key is good. 401 = bad key. 402 = out of credits.

End-to-end: add a crawl source via the admin UI (`/fitted/admin/sources`) with `kind=crawl` and trigger a poll — check `apps/job-api` logs for `Firecrawl returned …` lines.

## Cost / billing dashboard

- Usage: https://www.firecrawl.dev/app (top of page shows credits remaining)
- This service does **not** use `llm_cost_log` — Firecrawl bills its own credits, not per-token

## Where it's wired

- Scraper: `apps/job-api/app/services/firecrawl.py:66` (`fetch_firecrawl_jobs`)
- Poller integration: `apps/job-api/app/services/poller.py` (called when `crawl_source.kind == 'crawl'`)
- Schema sent to LLM extraction: `apps/job-api/app/services/firecrawl.py:16` (`_EXTRACT_SCHEMA`)

## Common errors

| Symptom                               | Cause                                | Fix                                                                                          |
| ------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------- |
| `401`                                 | wrong key                            | rotate, update `.env`, restart job-api                                                       |
| `402 payment_required`                | out of credits                       | top up at firecrawl.dev or remove the noisiest crawl sources                                 |
| Empty `jobs` array but page has roles | LLM extraction missed the structure  | open the URL — if it's behind login or a "Load more" button, Firecrawl can't see those roles |
| Many duplicates after the first crawl | careers URL has tracking params      | strip query params before saving the source URL — `_make_external_id` includes the URL       |
| `Firecrawl returned non-JSON`         | site returned HTML 5xx through proxy | usually transient; rerun the poll                                                            |
