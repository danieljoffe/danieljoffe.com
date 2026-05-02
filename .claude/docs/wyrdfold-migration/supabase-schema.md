# Wyrdfold migration audit — Supabase schema + migrations

**Issue:** #592 (parent: #596 → #564)
**Audit base:** `origin/chore/fitted-ui-refinements` @ `7101ce24`
**Migrations inspected:** 49 files, `20260213005724` → `20260501130000`

## Executive summary

The schema cleaves cleanly into two products:

- **Audit-tool tables** (`scans`, `scan_issues`, `leads`, `email_log`) plus the four `insights_*` views/functions that drive `/api/audit/insights/*` — **stay** in danieljoffe.com Supabase.
- **Fitted/Wyrdfold tables** (20 tables, 7 functions, 2 triggers) — **port** to a new `wyrdfold-prod` Supabase project.

There is **no shared table between the two products** (the name "insights" appears in both, but the audit's `insights_*` views key on Lighthouse `scans` data, not on jobs). Migration is a clean split, no entanglement.

**Recommended porting strategy: Option B (single dump baseline).**
Apply a rename-pass migration to current Supabase first, validate everything, dump schema-only, use that dump as `00000000000001_init.sql` in `wyrdfold-prod`. Cleaner than replaying 49 migrations with renames threaded through.

**Rename plan**: strip the redundant `job_` prefix in the wyrdfold DB (the whole DB is about jobs there), disambiguate `batch_jobs`, and rename `tailored_resumes` since it now also holds cover letters (per `document_type` column added in `20260424120000`).

**Data migration** is **out of scope** for the migration epic. New Wyrdfold users start fresh — `auth.uid()` from the root project does not match the new project's. Carrying over personal dev data is a launch-day concern (export-by-user, ID mapping) and deferred.

## 1. Migration inventory

### 1.1 Stay (danieljoffe.com Supabase)

| Migration                                            | Purpose                                                        |
| ---------------------------------------------------- | -------------------------------------------------------------- |
| `20260213005724_create_audit_tables.sql`             | `scans`, `scan_issues`, `leads`, `email_log`                   |
| `20260227120000_add_device_mode.sql`                 | scans column                                                   |
| `20260416120000_add_source_provider.sql`             | scans column                                                   |
| `20260418120000_add_scans_comparison_index.sql`      | index                                                          |
| `20260420120000_create_insights_views.sql`           | `insights_summary_view` (drives `/api/audit/insights/summary`) |
| `20260420130000_create_insights_violations_view.sql` | `insights_violations_view`                                     |
| `20260420140000_create_insights_score_stats_fn.sql`  | `insights_score_stats(period_days int)`                        |
| `20260420150000_create_insights_trends_fn.sql`       | `insights_trends(...)`                                         |
| `20260420160000_create_insights_domains_view.sql`    | `insights_domains_view`                                        |
| `20260420170000_add_insights_indexes.sql`            | indexes                                                        |
| `20260420180000_guard_insights_function_inputs.sql`  | hardening                                                      |

The "insights" namespace here is **audit-tool insights** (Lighthouse scan aggregations), not Fitted insights. Verified via the views' source comments (`drives /api/audit/insights/summary`).

### 1.2 Port (Wyrdfold-prod Supabase)

| Migration                                                 | Purpose                                                                                                                              |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `20260407120000_create_jobs_tables.sql`                   | `job_sources`, `job_postings`, `job_status_log`                                                                                      |
| `20260422120000_create_experience_tables.sql`             | `experience_prose_docs`, `experience_optimized_docs`, `experience_chunks`, `experience_conversation_turns`, `experience_preferences` |
| `20260422130000_create_llm_cost_log.sql`                  | `llm_cost_log`                                                                                                                       |
| `20260423120000_create_tailored_resumes.sql`              | `tailored_resumes`                                                                                                                   |
| `20260424120000_add_document_type.sql`                    | adds `document_type` (resume/cover_letter) — table now holds both                                                                    |
| `20260424120001_create_job_targets.sql`                   | `job_targets`                                                                                                                        |
| `20260424120002_add_url_validation_fields.sql`            | `job_targets` columns                                                                                                                |
| `20260424120003_seed_manual_job_source.sql`               | seed: 'manual' source row                                                                                                            |
| `20260424120004_create_job_analyses.sql`                  | `job_analyses`                                                                                                                       |
| `20260424120005_create_job_target_scores.sql`             | `job_target_scores`                                                                                                                  |
| `20260424120006_create_resume_uploads.sql`                | `resume_uploads` table + `resume-uploads` storage bucket                                                                             |
| `20260424120007_create_batch_jobs.sql`                    | `batch_jobs`                                                                                                                         |
| `20260425120000_add_resume_reuse_columns.sql`             | `tailored_resumes.source_resume_id`                                                                                                  |
| `20260425120001_resume_lifecycle.sql`                     | resume status lifecycle                                                                                                              |
| `20260426064755_add_target_search_keywords.sql`           | `job_targets` columns                                                                                                                |
| `20260426120000_add_sms_notification_columns.sql`         | `user_profiles` columns                                                                                                              |
| `20260426120001_add_salary_text.sql`                      | `job_postings` columns                                                                                                               |
| `20260426120002_add_query_indexes.sql`                    | indexes                                                                                                                              |
| `20260426120003_create_get_target_jobs_rpc.sql`           | `get_target_jobs(...)` function                                                                                                      |
| `20260426120004_fix_get_target_jobs_types.sql`            | function patch                                                                                                                       |
| `20260426120005_add_llm_score_columns.sql`                | `job_target_scores` columns                                                                                                          |
| `20260426120006_add_scoring_status.sql`                   | columns                                                                                                                              |
| `20260426120007_add_scoring_status_to_rpc.sql`            | function patch                                                                                                                       |
| `20260426120008_shared_targets.sql`                       | `user_targets` (replaces simple FK with M:N)                                                                                         |
| `20260427000001_match_target_rpc.sql`                     | `match_target_by_label(...)` function                                                                                                |
| `20260427000002_rename_system_user_to_tools_admin.sql`    | seed user rename                                                                                                                     |
| `20260428120000_add_target_id_to_job_analyses.sql`        | column                                                                                                                               |
| `20260428120001_profile_identity_and_resume_versions.sql` | `user_profiles`, `tailored_resume_versions`                                                                                          |
| `20260428120002_create_notification_tables.sql`           | `job_notification_sent`                                                                                                              |
| `20260428120003_tighten_rls_and_function_search_path.sql` | RLS hardening                                                                                                                        |
| `20260429120000_raise_match_target_threshold.sql`         | function patch                                                                                                                       |
| `20260429120001_drop_user_targets_resume_emphasis.sql`    | column drop                                                                                                                          |
| `20260430000000_add_normalized_label_trgm_index.sql`      | index                                                                                                                                |
| `20260430120000_enable_pg_stat_statements.sql`            | extension (decide whether wyrdfold-prod also enables)                                                                                |
| `20260430120001_bulk_update_job_postings_helpers.sql`     | `bulk_update_job_scores`, `bulk_update_job_salaries` functions                                                                       |
| `20260430120002_add_job_postings_filter_indexes.sql`      | indexes                                                                                                                              |
| `20260430120003_add_insights_query_indexes.sql`           | indexes (for Fitted insights, not audit)                                                                                             |
| `20260501120000_drop_user_profiles_email_not_null.sql`    | column nullability                                                                                                                   |
| `20260501130000_add_payload_md_to_tailored_resumes.sql`   | column                                                                                                                               |

### 1.3 Mixed / verify case-by-case

| Migration                            | Note                                       |
| ------------------------------------ | ------------------------------------------ |
| `20260227120000_add_device_mode.sql` | confirmed audit-tool (scans table) — stays |

No other mixed-purpose migrations identified.

## 2. Tables in scope (port)

20 tables total. Job-API Python references confirm 11 of these in active server use:

**Job-API table usage** (from `apps/job-api/app/`):
`job_analyses`, `job_notification_sent`, `job_postings`, `job_sources`, `job_status_log`, `job_target_scores`, `job_targets`, `llm_cost_log`, `resume_uploads`, `tailored_resumes`, `user_profiles`.

**Additional tables** accessed via Next.js API route handlers (`/api/career/experience/*`, `/api/targets/*`):
`experience_prose_docs`, `experience_optimized_docs`, `experience_chunks`, `experience_conversation_turns`, `experience_preferences`, `tailored_resume_versions`, `target_reference_jds`, `batch_jobs`, `user_targets`.

**Frontend `.from('table')` calls inside `/fitted`** are minimal (~0.1KB grep result) — confirming the architecture: frontend → Next.js API route or job-api → Supabase. Frontend does not query DB directly.

## 3. Functions, triggers, RPCs (port)

| Object                                                            | Purpose                                            |
| ----------------------------------------------------------------- | -------------------------------------------------- |
| `get_target_jobs(...)`                                            | RPC for target detail page                         |
| `match_target_by_label(...)`                                      | RPC for target deduplication                       |
| `sync_target_active()` + `trg_sync_target_active`                 | trigger keeping `job_targets.is_active` consistent |
| `set_user_profiles_updated_at()` + `trg_user_profiles_updated_at` | updated_at maintenance                             |
| `bulk_update_job_scores(p_updates jsonb)`                         | batch RPC                                          |
| `bulk_update_job_salaries(p_updates jsonb)`                       | batch RPC                                          |

## 4. RLS posture

**RLS enabled on every Fitted table.** No exceptions found in inventory.

Two service-role policies seen:

- `Service role full access on user_targets` — bypass for backend writes
- `Public can read completed scans` and `Public can read issues for completed scans` — these are **audit-tool only**, not in scope

The `20260428120003_tighten_rls_and_function_search_path.sql` migration hardens RLS and pins `SECURITY DEFINER` function `search_path` — important to carry over verbatim.

**`auth.uid()` matching is the dominant policy pattern.** Carry-over to Wyrdfold is mechanical: same function, different auth user pool.

**Risk**: existing user data in root project's Supabase is **not portable** to Wyrdfold — `auth.uid()` differs. Per the migration epic, Wyrdfold creates a fresh user pool. Document and accept; defer Daniel-specific dev data carry-over to launch.

## 5. Storage buckets

Migration `20260424120006_create_resume_uploads.sql` creates the **`resume-uploads` storage bucket** alongside the `resume_uploads` table. Wyrdfold-prod must provision the same bucket (private, RLS-gated by user_id).

No other storage buckets identified.

## 6. Seed data

| Seed                                                   | Purpose                                   | Action                       |
| ------------------------------------------------------ | ----------------------------------------- | ---------------------------- |
| `20260424120003_seed_manual_job_source.sql`            | inserts `'manual'` row into `job_sources` | port verbatim                |
| `20260427000002_rename_system_user_to_tools_admin.sql` | renames a seed user role                  | port (or fold into baseline) |

`apps/job-api/app/seed/company_seed.py` exists for company seeding. Out of scope for migration audit — covered in #591 (job-api audit).

## 7. Type generation

Per epic: types regenerate into `apps/wyrdfold/src/lib/supabase/types.ts`. After porting the schema, run:

```bash
pnpm supabase gen types typescript --project-id <wyrdfold-prod-id> \
  > apps/wyrdfold/src/lib/supabase/types.ts
```

Will need new `wyrdfold-prod-id` from epic Workstream 3.

## 8. Rename mapping (proposed)

Wyrdfold's DB is dedicated to jobs/career, so the redundant `job_` prefix on most tables can be stripped. Disambiguate `batch_jobs` from job postings. Rename `tailored_resumes` since it now holds both resumes and cover letters.

| Current name                    | Proposed Wyrdfold name          | Rationale                                                                      |
| ------------------------------- | ------------------------------- | ------------------------------------------------------------------------------ |
| `job_postings`                  | `jobs`                          | redundant prefix                                                               |
| `job_targets`                   | `targets`                       | redundant prefix                                                               |
| `job_sources`                   | `sources`                       | redundant prefix                                                               |
| `job_status_log`                | `status_log`                    | redundant prefix                                                               |
| `job_analyses`                  | `analyses`                      | redundant prefix                                                               |
| `job_target_scores`             | `scores`                        | "target" implicit since `targets` is the primary                               |
| `job_notification_sent`         | `notifications_sent`            | redundant prefix                                                               |
| `target_reference_jds`          | `reference_jds`                 | "target" implicit                                                              |
| `batch_jobs`                    | `batch_runs`                    | disambiguate from `jobs` postings                                              |
| `tailored_resumes`              | `documents`                     | now holds resumes + cover letters (`document_type` col)                        |
| `tailored_resume_versions`      | `document_versions`             | matches above                                                                  |
| `resume_uploads`                | `uploaded_resumes`              | active voice; `resume-uploads` bucket can keep its name or rename to `uploads` |
| `user_targets`                  | `user_targets`                  | keep — clearly user-scoped M:N                                                 |
| `user_profiles`                 | `user_profiles`                 | keep                                                                           |
| `experience_prose_docs`         | `experience_prose_docs`         | keep — describes user work experience                                          |
| `experience_optimized_docs`     | `experience_optimized_docs`     | keep                                                                           |
| `experience_chunks`             | `experience_chunks`             | keep                                                                           |
| `experience_conversation_turns` | `experience_conversation_turns` | keep                                                                           |
| `experience_preferences`        | `experience_preferences`        | keep                                                                           |
| `llm_cost_log`                  | `llm_costs`                     | drop redundant `_log`                                                          |

**Function/RPC renames** (track table renames):

| Current                    | Proposed                                              |
| -------------------------- | ----------------------------------------------------- |
| `get_target_jobs`          | `get_target_jobs` (still meaningful under new naming) |
| `match_target_by_label`    | `match_target_by_label`                               |
| `bulk_update_job_scores`   | `bulk_update_scores`                                  |
| `bulk_update_job_salaries` | `bulk_update_salaries`                                |
| `sync_target_active`       | `sync_target_active`                                  |

**Decision required from you**: confirm the rename mapping before migration runs. The renames ripple into ~30+ files (job-api routers/services + Next.js API handlers + types regen). If you want a tighter blast radius, a "minimal-change port" (no renames) is also viable — at the cost of weird-feeling identifiers in Wyrdfold's namespace.

## 9. Recommended porting strategy

**Option A — replay all migrations with renames threaded through**

- Pros: full migration history preserved; "audit trail" of every column tweak
- Cons: 38 migrations to mutate; high risk of typos in rename pass; carries forward "fix" patches that already healed

**Option B — single dump baseline (recommended)**

1. In current root Supabase, run a one-shot rename-pass migration (renaming tables, functions, foreign keys, indexes, policies)
2. Validate everything still works against root's app code (it won't, until app code is updated — so do this on a branch)
3. `pg_dump --schema-only --no-owner --no-privileges` against the renamed state
4. Use the dump as `wyrdfold-prod`'s `00000000000001_init.sql`
5. Delete the rename-pass migration from root (it never lands in main); root keeps original names
6. Wyrdfold codebase uses the new names from day one

This avoids both threading renames through 38 migrations AND keeping the renames in production root.

**Option C — fresh hand-written init from current schema, no rename pass**

- Pros: cleanest baseline; renames done by hand in the new file
- Cons: can drift from production reality; loses indexes/constraints if forgotten

**Recommendation: Option B.** It's mechanically reproducible and minimizes the chance of drift.

## 10. Risks and decisions

1. **Rename mapping needs sign-off** before mass code changes (§8).
2. **`pg_stat_statements` extension** — root has it enabled (`20260430120000`). Wyrdfold-prod: enable for parity.
3. **RLS service-role policy on `user_targets`** — verify the corresponding service-role key flows in Wyrdfold's job-api setup (cross-ref #591).
4. **`resume-uploads` bucket** — must be provisioned at the storage layer, not just the migration.
5. **No data migration**: Wyrdfold users start fresh. Daniel's personal dev data carry-over is a launch-day concern — document, defer.
6. **Migration timestamps**: if going with Option B, the new init file gets a fresh `00000000000001` timestamp; subsequent Wyrdfold migrations follow.
7. **Indexes worth re-examining** at port: trgm index, pg_stat_statements, query indexes added late in the sequence — confirm they still match the rename-target column names.

## Notes on collisions with the in-flight resume/cover-letter session

Other session is editing `apps/job-api/app/routers/tailor.py`, batch services, LLM clients, and just landed `20260501130000_add_payload_md_to_tailored_resumes.sql`. **No impact on schema audit conclusions**: the new column is captured in the inventory, and the `tailored_resumes` table is on the port list either way. If they add more migrations before Wyrdfold scaffolds, just rebase the dump baseline at port-time.

---

_Audit complete. Decisions for the epic: confirm rename mapping; choose porting strategy (recommend Option B); accept "fresh users" trade-off._
