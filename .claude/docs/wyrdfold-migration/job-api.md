# Job-API Audit & Shared-vs-Fork ADR — Wyrdfold Migration

Issue: #591 · Branch base: `chore/fitted-ui-refinements` · Audit date: 2026-05-01

`apps/job-api/` is the FastAPI service that powers /fitted. This audit
catalogs its endpoints, auth model, external dependencies, and Wyrdfold-
specific gaps, then decides whether Wyrdfold should share or fork it.

## TL;DR

- 11 routers, ~70 endpoints. All gated by a single dependency
  (`verify_api_key_or_session`) that today only ever resolves to one
  user (`SINGLE_USER_ID = "tools-admin"`).
- The service is **single-tenant by design**. `user_id=None` is hard-
  wired through persistence layers; multi-tenancy would touch every
  router, service, and cost-log call.
- Two — and only two — string-level couplings to /fitted exist:
  `notify.py:273` (SMS deep link) and a docstring reference in
  `services/targets/merge.py:6`. The API itself is product-agnostic.
- **Decision: fork into `apps/wyrdfold-api/` (or its own repo).**
  Sharing requires a multi-tenancy refactor that audit-tool doesn't
  need and would slow Wyrdfold's iteration. Fork now, share later via
  extracted libs (LLM client + scoring) only when Rule of Three hits.

## 1. Endpoint catalog

Routers registered in `app/main.py`:

| Router       | Prefix        | File                      | Notes                                                                                              |
| ------------ | ------------- | ------------------------- | -------------------------------------------------------------------------------------------------- | --- | --- | ---- |
| analysis     | `/analysis`   | `routers/analysis.py`     | LLM job-description analysis                                                                       |
| experience   | `/experience` | `routers/experience.py`   | Prose docs, optimized docs, conversation, gap tracker (longest router — handles SSE for `/derive`) |
| insights     | `/insights`   | `routers/insights.py`     | 3 GET endpoints (pipeline / skills-cost / targets) with `period=7d                                 | 30d | 90d | all` |
| jobs         | `/jobs`       | `routers/jobs.py`         | Sync `def` handlers (threadpool) — verified via 2026-04-30 load test                               |
| poll         | `/poll`       | `routers/poll.py`         | Cron-triggered poller endpoint                                                                     |
| sources      | `/sources`    | `routers/sources.py`      | Greenhouse/Lever/Ashby/Workday/Smartrecruiters seed CRUD                                           |
| status       | `/status`     | `routers/status.py`       | Status log                                                                                         |
| tailor       | `/tailor`     | `routers/tailor.py`       | Tailored resumes + cover letters (lifecycle, single-lookup, batch generation, versions)            |
| targets      | `/targets`    | `routers/targets.py`      | 19 endpoints: CRUD + activate/deactivate + reference JDs + derive-profile + poll-jobs + status     |
| user_profile | `/profile`    | `routers/user_profile.py` | Notification prefs + identity (resume contact info)                                                |
| (none)       | `/health`     | `app/main.py`             | Bypasses TrustedHost middleware                                                                    |

Every router declares a router-level
`dependencies=[Depends(verify_api_key_or_session)]`. Per-handler
`get_current_user_id` is added when a row needs the user_id (≈100% of
write paths).

## 2. Auth model

Defined in `app/dependencies.py`.

```
verify_api_key            x-api-key header == JOB_API_KEY  (hmac.compare_digest)
verify_session_jwt        Authorization: Bearer <HS256>    (ADMIN_SESSION_SECRET, sub=tools-admin)
verify_api_key_or_session ANY of the above                 (used by every router)
get_current_user_id       JWT sub if present, else SINGLE_USER_ID="tools-admin"
```

**BFF flow** (per `apps/root/src/data/content/projects/job-pipeline-case-study.mdx`):

```
Browser ──cookie──▶ Next.js (proxy.ts verifies admin JWT) ──Bearer──▶ job-api
Cron    ──x-api-key──────────────────────────────────────────────▶ job-api
```

Next.js mints the short-lived session JWT via `apps/root/src/lib/adminSession.ts`. The job-api never sees the long-lived admin cookie.

**Wyrdfold implications:**

- `tools-admin` is hardcoded as the only valid `sub`. Wyrdfold has multiple users — this check must become "any valid Supabase JWT" or
  similar.
- `get_current_user_id` returns the literal `"tools-admin"` string for api-key callers. Multi-tenant Wyrdfold cannot use api-key paths
  except for trusted internal cron. Recommendation: keep api-key for cron only (poller, batch jobs); require Supabase JWT for all
  user-facing endpoints.
- `JOB_API_KEY` and `ADMIN_SESSION_SECRET` need to become Wyrdfold-specific secrets in the new deployment.

## 3. Settings (env vars)

`app/config.py` — pydantic-settings BaseSettings:

| Var                                                | Required for              | Wyrdfold action                             |
| -------------------------------------------------- | ------------------------- | ------------------------------------------- |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`        | DB                        | Wyrdfold's separate Supabase project        |
| `JOB_API_KEY`                                      | api-key auth              | Restrict scope to internal cron             |
| `ADMIN_SESSION_SECRET`                             | session JWT               | Replace with Supabase JWT verification      |
| `ALLOWED_HOSTS`                                    | TrustedHostMiddleware     | Set to Wyrdfold's frontend hosts            |
| `ANTHROPIC_API_KEY`, `LLM_PROVIDER`                | LLM                       | Same key works; consider per-product budget |
| `VOYAGE_API_KEY`, `EMBEDDINGS_PROVIDER`            | embeddings                | Same                                        |
| `TWILIO_*`                                         | SMS                       | Optional — defer for Wyrdfold v1            |
| `NEXT_APP_URL`, `JOB_ALERT_SECRET`                 | email alerts BFF callback | Replace with Wyrdfold web URL               |
| `FIRECRAWL_API_KEY`                                | JD scraping fallback      | Same                                        |
| `GREENHOUSE_DELAY_MS`, `SLOW_REQUEST_THRESHOLD_MS` | throttling/log            | Same                                        |
| `VALIDATE_POLL_URLS`                               | poller                    | Same                                        |

No CORS middleware is registered — only `TrustedHostMiddleware`.
That is correct for the BFF pattern (server-to-server). If Wyrdfold's
browser ever calls the API directly, add `CORSMiddleware`.

## 4. External services

```
Anthropic (claude-opus-4-7 / sonnet-4-6 / haiku-4-5) — services/llm/anthropic_client.py
Voyage AI (embeddings)                                — services/embeddings/voyage_client.py
Twilio                                                — services/notify.py (SMS)
Resend (via Next.js BFF)                              — services/notify.py POSTs /api/email/job-alert
Firecrawl                                             — services/firecrawl.py (JS-rendered JDs)
Greenhouse / Lever / Ashby / Workday / SmartRecruiters — services/{provider}.py
```

LLM and embeddings both follow the same pattern: a `Client` Protocol,
a `Mock*Client` for tests, a real client. `get_default_client()` is
mock by default — only `LLM_PROVIDER=anthropic` or
`EMBEDDINGS_PROVIDER=voyage` flip to real. This is reusable as-is.

**Cost logging:** every LLM/embedding call writes one `llm_cost_log`
row tagged with `purpose` (e.g., `target.derive_fit_score`,
`tailor.cover_letter`, `experience.derive`). Today every row has
`user_id = NULL`. Multi-tenant Wyrdfold must thread the real user_id
into `cost_log.record(...)` callsites.

## 5. /fitted-specific code in job-api

Total grep hits: **2**.

| File:line                     | Hit                                                                           | Action                                                                       |
| ----------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `services/notify.py:273`      | `f"{settings.next_app_url.rstrip('/')}/fitted/jobs/{job_id}"` (SMS deep link) | Make path configurable: `settings.deep_link_jobs_path` defaulting to `/jobs` |
| `services/targets/merge.py:6` | Docstring `"Strategy (per fitted-scope.md):"`                                 | Cosmetic — drop or update                                                    |

Everything else is product-agnostic: extraction, scoring, persistence,
LLM plumbing, ATS lint, ingest, embeddings, conversation orchestrator.

## 6. Single-tenant invariants (the hard part)

These are the patterns that block sharing the live service across
audit-tool and Wyrdfold:

1. **`user_id=None` everywhere.** Most service-layer functions take
   `user_id: str | None`. They use `.is_("user_id", "null")` for
   filtering. Examples: `prose.get_latest(supabase, user_id=None)`,
   `optimized.get_latest(supabase, user_id=None)`,
   `cost_log.record(supabase, user_id=None, ...)`.
2. **`SINGLE_USER_ID = "tools-admin"` constant** in `dependencies.py`.
3. **Cache keys assume one user.** `app/cache.py`'s `job_list_cache`
   doesn't include user_id in the cache key. Multi-tenant fan-out
   would leak rows across users.
4. **Polling cron is global**, not per-user. The poller iterates all
   `user_targets` rows but in practice `tools-admin` is the only
   user, so per-user rate budgets don't exist.
5. **No RLS enforcement at the service layer.** Service-role key
   bypasses RLS, so even when the DB has policies, this code never
   exercises them. Wyrdfold would need per-request user context (or
   per-user JWT-scoped Supabase clients) to make RLS meaningful.

## 7. Sentry / observability gap

**Job-api has no Sentry integration.** No `sentry_sdk` in
`pyproject.toml`. Errors are caught by the global FastAPI exception
handler and logged via stdlib `logging`.

This is fine for a personal admin tool but a blocker for a public
Wyrdfold service. **Wyrdfold must add `sentry-sdk[fastapi]` from day
one.** Audit-api's pattern (FastAPI integration) is the reference.

## 8. Test coverage snapshot

51 test files in `apps/job-api/tests/`. Coverage is solid for
extraction, scoring, parsers, LLM mock, tailor/cover-letter, target
operations, and conversation orchestrator. Conftest sets test env
vars, force-overrides `ALLOWED_HOSTS=*`, and clears the in-memory
cache between tests.

Gaps for Wyrdfold:

- No tests exercise multi-user data isolation (because there is no
  multi-user mode).
- No auth-failure tests for `verify_api_key_or_session` malformed
  Bearer tokens.
- No load tests in CI (the 2026-04-30 load test was a one-off
  documented in `.claude/docs/cleanup/`).

## 9. Deploy

- `apps/job-api/Dockerfile` (Python 3.11-slim + uv + pandoc)
- `apps/job-api/railway.toml` (Railway deployment)
- Nx targets: `dev`, `test`, `lint`, `typecheck` (no `build`/`deploy` —
  Railway builds from the Dockerfile directly)

For Wyrdfold: spin up a separate Railway project (or alternative —
Fly/Render). Same Dockerfile, different env, different Supabase. **Do
not** point a second deployment at the audit-tool Supabase.

## 10. ADR — Shared service vs. fork

**Decision: Fork into `apps/wyrdfold-api/`.**

### Considered

**Option A — Share the live service across audit-tool and Wyrdfold.**

Pros: zero code duplication, one deploy.

Cons: requires a multi-tenancy refactor (~every service-layer
function, every cost-log row, cache keys, JWT verification, RLS).
Audit-tool doesn't need any of that. The blast radius of a regression
would span both products. Auth couples to one Supabase project (Daniel's
admin), but Wyrdfold needs its own Supabase per the schema audit (#592).

**Option B — Fork the codebase into `apps/wyrdfold-api/`.**

Pros: Wyrdfold ships a multi-tenant API without destabilizing
audit-tool. Each service has its own Supabase, its own deploy, its own
LLM budget, its own auth model. Diverging concerns can diverge
cleanly.

Cons: short-term duplication. Bug fixes need to be cherry-picked.

**Option C — Extract a shared lib + two thin services.**

Pros: best of both — shared LLM client / scoring / extraction code in
`libs/python/job-core/`, separate `apps/job-api/` and
`apps/wyrdfold-api/` consuming it.

Cons: premature. We don't yet know what divergence looks like — pulling
out a lib before the second consumer ships locks in the wrong seams.
Rule of Three hasn't fired yet (we have one consumer; Wyrdfold makes
two).

### Choice: B now, C later

Fork into `apps/wyrdfold-api/` for v1. After Wyrdfold ships and
divergence is understood, harvest a shared lib (Option C) for the
patterns that actually stayed identical:

- `app/services/llm/` (almost certainly shared)
- `app/services/embeddings/` (almost certainly shared)
- `app/services/scoring.py` and `app/services/target_scoring.py` (likely
  shared)
- `app/services/extract.py`, ATS provider clients, `app/services/jd_parser.py`,
  `app/services/sanitize.py`, `app/services/jsonld.py` (likely shared)

What will diverge: auth, persistence (table renames per #592 — `job_postings → jobs`,
`job_targets → targets`, `tailored_resumes → documents`), the BFF callback URL,
deep links, multi-tenancy plumbing.

## 11. Wyrdfold-api scaffold checklist

When kicking off Wyrdfold-api:

1. `cp -r apps/job-api apps/wyrdfold-api` (then delete tests we won't
   port immediately — keep extraction, scoring, LLM, ATS lint).
2. Replace `verify_api_key_or_session` with `verify_supabase_jwt`
   (validates HS256 token signed by Wyrdfold's Supabase project).
   Keep an api-key dep for internal cron only.
3. Replace `SINGLE_USER_ID = "tools-admin"` with the real JWT `sub`
   threaded through every persistence call. Audit every `user_id=None`
   in services and replace with `user_id` from the request.
4. Add `sentry-sdk[fastapi]` and wire the FastAPI integration.
5. Apply Supabase rename-pass migration from #592 audit
   (`job_postings → jobs`, `job_targets → targets`,
   `tailored_resumes → documents`, etc.). Update every `.table("...")`
   call.
6. Update `cache.py` to include `user_id` in cache keys.
7. Decide: is Wyrdfold's frontend a BFF (Next.js → wyrdfold-api), or
   does the browser hit wyrdfold-api directly with a Supabase token?
   If the latter, add `CORSMiddleware` and tighten `ALLOWED_HOSTS`.
8. Provision the `resume-uploads` storage bucket in Wyrdfold's Supabase.
9. Wire deploy: Railway/Fly project with Wyrdfold's env, Wyrdfold's
   Supabase URL/service-role key, fresh `JOB_API_KEY` and
   `ADMIN_SESSION_SECRET` (or whatever replaces it).
10. Replace the `/fitted/jobs/{id}` deep link in `notify.py` with a
    Wyrdfold-specific URL, ideally pulled from a setting.

## 12. Out of scope for this audit

- The Next.js BFF layer (`apps/root/src/app/api/jobs/proxy.ts` and
  siblings) is covered by **#590** (API routes audit).
- The frontend surfaces that consume these endpoints are covered by
  **#584/585/586/587** (targets/jobs/insights/profile audits).
- Auth flow at the Next.js side is covered by **#588**.

## 13. Collisions encountered

The other session is actively editing in `chore/fitted-ui-refinements`:

- `apps/job-api/app/routers/tailor.py`
- `apps/job-api/app/services/batch.py`
- `apps/job-api/app/services/llm/{anthropic_client,client,mock}.py`
- `apps/job-api/app/services/tailor/persistence.py`
- Several test files

These changes did not block the audit — the structural inventory
(routers, prefixes, dependencies, settings, external services) is
stable across the in-flight edits, and the shared-vs-fork decision
turns on architecture, not on the contents of any one handler.
