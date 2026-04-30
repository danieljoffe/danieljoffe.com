# API + DB Query Audit — 2026-04-30 (rev. 2, post shared-targets refactor)

## Summary

The Fitted backend shows a solid foundation with good practices (RPC for join operations, batch score updates, proper cost logging), but has critical optimization opportunities in sequential database updates, inefficient N+1 scoring patterns for manual entries, repeated document fetches within single requests, and missing indexes for common filter columns. The biggest wins are batching the manual job scoring loop, deduplicating optimized doc fetches across endpoints, and adding indexes on `job_postings.company_name` and `job_postings.title`. Multi-user scaling will expose the sequential update patterns in backfill salary and score refresh operations.

**Rev 2 update (post shared-targets):** the new `user_targets` junction, fuzzy match RPC, and `scored_profile_version` lazy re-score path were re-audited. One critical gap was found and shipped: the `match_target_by_label` RPC was running full table scans because the migration created a btree index on `job_targets.normalized_label` while the RPC uses `similarity()` (pg_trgm) which needs GIN. Migration `20260430000000_add_normalized_label_trgm_index.sql` swaps it. The shared-targets schema otherwise introduced **no new N+1 risks** — `/targets/mine` uses the correct two-query batch pattern, `bulk_score_for_target` correctly skips up-to-date rows via `scored_profile_version`, and the `sync_target_active` trigger uses an indexed EXISTS subquery.

## Critical (do these first)

- **[FIXED][Missing Index]** `supabase/migrations/20260426120008_shared_targets.sql:16-17` — created btree index on `job_targets.normalized_label`, but `match_target_by_label` RPC calls `similarity(normalized_label, $1)` (pg_trgm) which a btree cannot serve. Every fuzzy-match query was a full table scan. **Fixed in `20260430000000_add_normalized_label_trgm_index.sql`** — swapped to `GIN(normalized_label gin_trgm_ops)`, which serves both `similarity()` and `=` lookups.

- **[HIGH][N+1 Queries]** `apps/job-api/app/routers/jobs.py:437-454` — manual job POST endpoint loops through all active targets sequentially, calling `target_score_and_upsert()` one at a time. For 10+ active targets, this becomes 10+ round-trips. Fix: collect all scoring tasks in `asyncio.gather()` wrapper or batch the upserts. (Note: Python SDK is sync, so use `asyncio.to_thread()` to parallelize.)

- **[HIGH][Sequential Updates]** `apps/job-api/app/routers/jobs.py:505-513` — backfill salary endpoint updates each row individually inside a loop. With thousands of rows, this becomes 1000+ individual `UPDATE` statements. Fix: collect all rows into `rows_to_upsert` list and do one bulk `.upsert(...).execute()` at the end.

- **[HIGH][Repeated Fetches]** Multiple routers call `optimized.get_latest(supabase, user_id=None)` multiple times per request (`analysis.py:37`, `tailor.py:79`, `targets.py:169/200/248/360/395`). For single-user today, this is low-cost, but each fetch is a round-trip. Fix: fetch once per request in a dependency or pass via context.

## High-impact optimizations

- **[HIGH][Missing Index]** `supabase/migrations/*.sql` — no index on `job_postings(company_name)` but `list_jobs` filters by `eq("company_name", company)` at line 288. Add: `CREATE INDEX idx_job_postings_company_name ON job_postings(company_name);`

- **[HIGH][Missing Index]** No index on `job_postings(title)` but `list_jobs` filters by `ilike("title", f"%{search}%")` at line 290. Add: `CREATE EXTENSION IF NOT EXISTS pg_trgm;` then `CREATE INDEX idx_job_postings_title_trgm ON job_postings USING GIN(title gin_trgm_ops);`

- **[MED][Inefficient RPC]** `20260426120007_add_scoring_status_to_rpc.sql` — the `get_target_jobs()` RPC computes `COUNT(*) OVER ()` on every row, adding overhead. The two-query fallback in `jobs.py:100-183` already computes count server-side. Fix: make count optional or return it in a separate field to avoid redundant computation on every result row.

- **[MED][Sequential DB Calls]** `apps/job-api/app/services/target_scoring.py:315-321` — `batch_update_global_scores()` updates each job's global score in a loop. With 100+ jobs re-scored, this is 100+ UPDATE statements. Fix: use a single UPDATE with a CASE expression, or move to a Postgres trigger that recomputes the average on insert/update of `job_target_scores`.

- **[MED][Trigger Overhead — multi-user]** `supabase/migrations/20260426120008_shared_targets.sql:54-80` — `sync_target_active` trigger fires per row and runs an `EXISTS` subquery + `UPDATE job_targets`. Acceptable for single-user, but bulk deactivation (e.g., 50 active targets toggled off) compounds to 50 trigger fires × 50 updates. EXISTS uses the partial index `idx_user_targets_active`, so each fire is fast — but it's still chatty. Consider a batch deactivate endpoint that emits one `UPDATE job_targets … WHERE id = ANY(...)` after a multi-row update on `user_targets`. Defer until multi-user load justifies it.

## Medium

- **[MED][Over-fetching]** `apps/job-api/app/routers/jobs.py:55-59` — `_JP_SELECT_COLS` includes 14 columns (salary_text, greenhouse_updated_at, etc.) but many endpoints may only need `id, title, score, status`. Profile actual usage and create narrow column sets for list views.

- **[MED][Over-fetching]** `apps/job-api/app/routers/targets.py:660` — `list_reference_jds()` likely fetches all columns. If only `jd_text + url` are used, add a `.select("id, jd_text, jd_url, extracted_profile")` override.

- **[MED][No Pagination Check]** `apps/audit-api/app/routers/run_scan.py` is minimal and doesn't show full context, but queue-based architecture is good. If audit scans ever list historical results, ensure `.limit()` is enforced.

- **[MED][Cache Invalidation]** `apps/job-api/app/routers/jobs.py:457, 480, 520` — calling `job_list_cache.invalidate()` after every manual add/rescore/backfill is correct for single-user, but on multi-user it will thrash. Consider time-based TTL (60s already set at line 242) instead of eager invalidation.

## Low / nice-to-have

- **[LOW][LLM Caching]** `apps/job-api/app/services/llm/anthropic_client.py` and callers support `cache_system=True` for prompt caching, but not all high-volume endpoints use it. Profile which endpoints call LLM most frequently with static system prompts and enable caching (e.g., `analysis.py`, `tailor.py` derive calls).

- **[LOW][Sync DB Overhead]** Supabase Python SDK is synchronous; every `.execute()` blocks the event loop briefly. For single-user, acceptable. At scale, wrap high-volume calls in `asyncio.to_thread()` to parallelize I/O.

- **[LOW][Unused Columns]** `job_postings.department` is selected in most queries but may not be displayed. Verify actual usage before keeping in default column set.

## Index recommendations

```sql
-- Add missing indexes for common filters
CREATE INDEX IF NOT EXISTS idx_job_postings_company_name ON job_postings(company_name);

-- For ILIKE queries on title (requires pg_trgm extension)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_job_postings_title_trgm ON job_postings USING GIN(title gin_trgm_ops);

-- Already exists: idx_jts_target_score, idx_analyses_cache_lookup
-- Already exists (rev 2): idx_job_targets_normalized_label_trgm — supports both similarity() and = on normalized_label
-- Consider: composite index for (job_posting_id, user_id, created_at) on analyses if lookups are frequent
```

## Files reviewed

**Routers (endpoints):**

- `apps/job-api/app/routers/jobs.py` — list_jobs, manual entry (N+1), backfill-salary (sequential updates)
- `apps/job-api/app/routers/targets.py` — target CRUD, link, derive-profile
- `apps/job-api/app/routers/analysis.py` — analysis caching, repeated doc fetch
- `apps/job-api/app/routers/tailor.py` — resume/cover-letter synthesis
- `apps/job-api/app/routers/experience.py` — prose, optimized doc, experience management
- `apps/audit-api/app/routers/run_scan.py` — audit queue

**Services:**

- `apps/job-api/app/services/target_scoring.py` — three-stage scoring, batch updates (sequential loop in global score)
- `apps/job-api/app/services/llm/client.py`, `anthropic_client.py` — LLM client with cache_system support

**Migrations:**

- `supabase/migrations/20260407120000_create_jobs_tables.sql` — base schema, missing company_name + title indexes
- `supabase/migrations/20260426120002_add_query_indexes.sql` — composite indexes exist
- `supabase/migrations/20260426120007_add_scoring_status_to_rpc.sql` — get_target_jobs RPC with COUNT(\*) OVER() overhead

**Next.js API:**

- `apps/root/src/app/api/jobs/proxy.ts` — proxy implementation with timeouts
- `apps/root/src/app/api/jobs/route.ts`, `/jobs/tailor/batch/route.ts`, `/career/experience/prose/route.ts` — thin proxies (good pattern)
