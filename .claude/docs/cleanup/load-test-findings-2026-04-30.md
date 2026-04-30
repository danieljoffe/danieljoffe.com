# Load Test Findings — 2026-04-30

**Setup:** 30s, 25 VUs, async httpx, hitting local job-api against remote Supabase.
**Result:** 173 requests, 0 errors, **5.0 RPS**.

## Latency by endpoint

| Endpoint                             | n   | p50    | p95    | p99    |
| ------------------------------------ | --- | ------ | ------ | ------ |
| `GET /insights/skills-cost`          | 25  | 6993ms | 7943ms | 7944ms |
| `GET /insights/targets`              | 25  | 6834ms | 7939ms | 7944ms |
| `GET /targets`                       | 25  | 5024ms | 7319ms | 7818ms |
| `GET /insights/pipeline`             | 25  | 5879ms | 6834ms | 7709ms |
| `GET /targets/mine`                  | 20  | 5435ms | 6255ms | 6255ms |
| `GET /jobs?limit=50&search=engineer` | 25  | 215ms  | 5891ms | 5892ms |
| `GET /targets/active`                | 3   | 4743ms | 5393ms | 5393ms |
| `GET /jobs?limit=50`                 | 25  | 1770ms | 1975ms | 1976ms |

## Top queries by total time (`pg_stat_statements`)

| Query                                            | Calls | Mean (ms) | Total (ms) |
| ------------------------------------------------ | ----- | --------- | ---------- |
| `experience_chunks` paginated SELECT (variant A) | 7     | 359       | 2516       |
| `job_postings` paginated SELECT (variant A)      | 18    | 135       | 2433       |
| `job_postings` paginated SELECT (variant B)      | 9     | 204       | 1836       |
| `job_postings` paginated SELECT (variant C)      | 4     | 340       | 1360       |
| `job_postings` paginated SELECT (variant D)      | 4     | 195       | 781        |
| `job_postings` UPSERT                            | 122   | 17.6      | 2145       |
| `job_postings` UPSERT (variant)                  | 112   | 11.0      | 1227       |
| `insights_summary_view` SELECT                   | 96    | 11.0      | 1058       |
| `job_target_scores` SELECT by target_id          | 768   | 1.4       | 1041       |
| `job_target_scores` INSERT                       | 2052  | 0.5       | 1007       |
| `experience_optimized_docs` SELECT by user       | 570   | 1.1       | 633        |
| `job_postings` UPDATE score                      | 1303  | 0.3       | 428        |

## Diagnosis

**The database is not the bottleneck.** Aggregate DB time during the 30s test was ~17s spread across many small queries — the database sat mostly idle. But endpoints averaged 5–7s p50.

**The Python process is the bottleneck.** The Supabase Python SDK is synchronous; every `.execute()` blocks the event loop. With 25 concurrent VUs and a single uvicorn worker, requests serialize on the GIL. The 215ms p50 vs 5891ms p95 on `/jobs?limit=50&search=engineer` is the smoking gun — first response is fast, then 24 others queue.

**Secondary findings (real but smaller):**

1. **Four variants of `job_postings` paginated SELECT** with different column projections (mean 135–340ms). Different routers project different columns. If we standardize to one narrow column set the planner can cache more effectively.
2. **`experience_chunks` paginated SELECT at 359ms mean** is the single slowest query. Worth EXPLAINing — likely missing index on `optimized_doc_id` ordering or pulling the embedding column when not needed.
3. **`job_target_scores` SELECT at 768 calls** during a 30s test where `/targets/*` was hit 73 times → ~10 lookups per target request. N+1 candidate.
4. **`experience_optimized_docs` SELECT at 570 calls** confirms the audit's "repeated fetch within single request" finding. Cache-per-request would cut these by 4–5×.

## The 3 highest-impact fixes (revised after data)

### 1. Wrap `.execute()` in `asyncio.to_thread()` for hot read endpoints

Highest-leverage change. The DB has slack capacity but the event loop is blocked. Targets:

- `app/services/experience/optimized.py::get_latest`
- `app/services/insights.py` (the 3 insights endpoints all serialize on this)
- `app/routers/jobs.py::list_jobs`
- `app/services/targets/crud.py::list_for_user`

Expect: `/insights/*` p50 from 7s → ~1s, RPS from 5 → 20+.

### 2. Per-request cache for `optimized.get_latest` + `experience_optimized_docs` lookups

The audit flagged this; the data confirms it. 570 calls in 30s for a row that changes hourly at most. A request-scoped LRU (FastAPI `Depends` with `lru_cache(maxsize=1)` on a request-bound key) eliminates duplicates within a single endpoint call.

### 3. EXPLAIN the `experience_chunks` paginated SELECT

359ms mean for paginated reads is high. Likely needs `(optimized_doc_id, id)` composite or to project away the `embedding` column when the caller doesn't need it. One quick `EXPLAIN ANALYZE` will tell us which.

## Skipped / deferred

- **Manual-job N+1** (audit's #1 critical) — endpoint not hit in this test (POST /jobs/manual). Still a real issue at multi-target scale, but it's not what's hurting current p95. Deferred.
- **Missing `job_postings.company_name` index** — not surfaced by the test because no query filtered on it. Add only when we see slow company-filtered list calls in production.
- **`get_target_jobs` COUNT(\*) OVER()** — the RPC wasn't called by the load-test endpoints. Defer until we see it in real traffic.

## After fix #1 — flip read handlers from `async def` to `def`

Same load profile (30s, 25 VUs):

| Endpoint                    | p50 before | p50 after | speedup |
| --------------------------- | ---------- | --------- | ------- |
| `GET /insights/skills-cost` | 6993ms     | 632ms     | **11×** |
| `GET /insights/targets`     | 6834ms     | 452ms     | **15×** |
| `GET /insights/pipeline`    | 5879ms     | 664ms     | **9×**  |
| `GET /targets`              | 5024ms     | 219ms     | **23×** |
| `GET /targets/mine`         | 5435ms     | 434ms     | **13×** |
| `GET /targets/active`       | 4743ms     | 211ms     | **22×** |

Throughput: **5 → 85 RPS** (17× improvement). 2562 requests, 10 errors (0.4%).

The errors were `httpx.RemoteProtocolError: Server disconnected` from the
shared supabase client's connection pool dropping connections under burst.
Below the noise floor for production traffic (typical 1-5 RPS) — deferred.
If we ever push real load, swap the singleton supabase client for a
short-lived per-request client, or add `httpx.HTTPTransport(retries=2)`.

## How to re-run

```bash
# 1. Reset stats (optional — gives a clean read)
pnpm exec supabase db query --linked "SELECT pg_stat_statements_reset();"

# 2. Start API
cd apps/job-api && uv run uvicorn app.main:app --host 127.0.0.1 --port 8000 --log-level warning

# 3. Run load test (separate terminal)
cd apps/job-api && JOB_API_KEY=$(grep '^JOB_API_KEY=' .env | cut -d= -f2-) \
  uv run python scripts/load_test.py --duration 30 --vus 25

# 4. Inspect top queries
pnpm exec supabase db query --linked "SELECT substring(query, 1, 140) AS query, calls, round(mean_exec_time::numeric, 1) AS mean_ms, round(total_exec_time::numeric, 0) AS total_ms FROM pg_stat_statements WHERE query ILIKE '%public.%' ORDER BY total_exec_time DESC LIMIT 25;"
```
