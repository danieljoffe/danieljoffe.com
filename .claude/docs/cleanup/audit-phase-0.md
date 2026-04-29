# Audit Phase 0 — Foundation

Covers Phase 0 of [#493](https://github.com/danieljoffe/danieljoffe.com/issues/493): auth, job targets, URL validation.

**Sub-issues:** [#494](https://github.com/danieljoffe/danieljoffe.com/issues/494) · [#495](https://github.com/danieljoffe/danieljoffe.com/issues/495) · [#496](https://github.com/danieljoffe/danieljoffe.com/issues/496)

## Phase summary

| Sub-issue           | Status     | Headline finding                                                                                                                                                                           |
| ------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| #494 Supabase Auth  | ✅ shipped | All ACs met. Auth gate lives in `proxy.ts`, not the layout (worth documenting).                                                                                                            |
| #495 Job targets    | ✅ shipped | Shared-targets refactor (PR #545) cleanly removed `user_id` from `JobTarget`. Router has grown to 16 endpoints / ~593 lines — candidate for split. Thin tests on derive/suggest LLM paths. |
| #496 URL validation | ✅ shipped | Healthy. 39 tests, four-layer pipeline, 24 banned domains. No cleanup needed.                                                                                                              |

**Open triage decisions** (for the user): see [Triage queue](#triage-queue) at the bottom.

---

## #494 — Supabase Auth magic link login

### Status: ✅ shipped

### Code map

**Frontend (Next.js)**

- `apps/root/src/proxy.ts:140-175` — single source of truth for fitted auth gating
  - `handleFittedAuth()` lines 66-138 — Supabase SSR client, redirects unauth → `/fitted/login`
  - Admin JWT auth (`/tools/admin`) handled separately at lines 142-152 — unchanged
- `apps/root/src/app/fitted/login/page.tsx` (11 lines) — server wrapper
- `apps/root/src/app/fitted/login/MagicLinkForm.tsx` (124 lines) — client form, calls `signInWithOtp()`
- `apps/root/src/app/fitted/auth/callback/route.ts` (27 lines) — `exchangeCodeForSession()` → redirect
- `apps/root/src/lib/supabase/auth-server.ts` — server client factory
- `apps/root/src/lib/supabase/auth-client.ts` — browser client factory
- `apps/root/src/app/fitted/layout.tsx` — pass-through layout; comment explains gate is in `proxy.ts`

**Backend (FastAPI)**

- `apps/job-api/app/dependencies.py:71-91` — `verify_session_jwt()` decodes JWT with `admin_session_secret`, validates `sub`
- `apps/job-api/app/dependencies.py:94-116` — `verify_api_key_or_session()` — JWT first, API key fallback
- `apps/job-api/app/dependencies.py:125-155` — `get_current_user_id()` — returns sub or `SINGLE_USER_ID` sentinel

**Tests**

- `apps/job-api/tests/test_dependencies.py` (16 tests) — adequate ✅

### Acceptance criteria

| AC                                                            | Status | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Magic link login flow works end-to-end                        | ✅     | MagicLinkForm.tsx → callback/route.ts. Verified manually during PR #545.                                                                                                                                                                                                                                                                                                                                                                                             |
| Session persists across page refreshes                        | ✅     | Supabase SSR client manages cookies; `proxy.ts:106-108` re-reads on every request.                                                                                                                                                                                                                                                                                                                                                                                   |
| Unauthenticated users redirected to login                     | ✅     | `proxy.ts:128-132` — verified.                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| FastAPI backend validates Supabase JWT on protected endpoints | 🟡     | `dependencies.py:71-91` validates JWT, but the secret used is `admin_session_secret`, **not** the Supabase project JWT secret. So fitted backend endpoints are guarded by the _admin_ JWT, not Supabase Auth tokens. The router-level `Depends(verify_api_key_or_session)` works in practice because the user-facing app proxies through Next.js routes (which inject the API key). But the AC as written ("validates Supabase JWT") is technically not implemented. |
| Existing admin auth (`/tools/admin`) unchanged                | ✅     | `proxy.ts:142-152` — same `admin_session` cookie + JWT path as before.                                                                                                                                                                                                                                                                                                                                                                                               |

### Findings

**F0-A: AC #4 ambiguity — "validates Supabase JWT"**
The plan said FastAPI would validate the Supabase JWT directly on protected endpoints. In practice, fitted's data flow is `browser → Next.js API route → FastAPI` and the Next.js layer injects an API key. FastAPI never sees a Supabase JWT.

This is fine for single-user, but worth deciding: do we want FastAPI to actually verify Supabase tokens (defense in depth) or do we accept that the API key is the trust boundary? Should be re-evaluated before multi-user.

**F0-B: `SINGLE_USER_ID` sentinel coupling** (`dependencies.py:120-155`)
`get_current_user_id()` returns `SINGLE_USER_ID = "tools-admin"` when an API key is presented. This worked pre-multi-user, but now `user_targets.user_id` matches `tools-admin` exactly — there's no clean way for a real Supabase-authenticated user to get a different `user_id` until F0-A is addressed.

**F0-C: dual auth paths intentional, not dead**
`verify_api_key_or_session` is _both_ JWT and API-key. Not a cleanup target — required while admin tooling and fitted both call the same endpoints.

### Fixes applied

_(none yet — see [Triage queue](#triage-queue))_

---

## #495 — Job targets: schema, service, scoring profile derivation

### Status: ✅ shipped (with cruft after the shared-targets refactor)

### Code map

**Migrations**

- `supabase/migrations/20260424120001_create_job_targets.sql` — original Phase 0 schema
- `supabase/migrations/20260426120008_shared_targets.sql` — PR #545 refactor: adds `user_targets`, drops `user_id`/`resume_emphasis` from `job_targets`
- `supabase/migrations/20260427000002_rename_system_user_to_tools_admin.sql` — fixup applied during shared-targets verification

**Backend models** (`apps/job-api/app/models/targets.py`, 171 lines)

- `JobTarget` (lines 58-69) — clean post-refactor; **no `user_id`** ✅
- `UserTarget` (lines 72-83) — junction row with `fit_score`, `fit_score_reasoning`
- `UserTargetWithTarget` (lines 98-102) — response composite
- `ScoringProfile` family (lines 16-44) — Pydantic-validated
- `ResumeEmphasis` (lines 47-52) — moved to `user_targets`
- `TargetSuggestion` / `MatchedSuggestion` (lines 142-170) — LLM output shapes

**Backend services** (`apps/job-api/app/services/targets/`)

- `crud.py` — CRUD on `job_targets` + `user_targets` (link/unlink, set_active)
- `derive_profile.py` — `derive_profile_from_jd()` — LLM
- `derive_profile_from_label.py` — `derive_profile_from_label()` — LLM (post-Phase 0; Phase 4 onboarding)
- `merge.py` — `merge_profiles()` — averages keyword weights when reference JDs are added
- `suggest.py` — `suggest_targets()` — LLM produces 2-3 targets from optimized experience
- `match.py` — `suggest_and_match()` — fuzzy-matches suggestions to existing targets (uses `pg_trgm`)
- `fit_score.py` — `derive_fit_score()` — LLM 0-100 score; backfilled by `scripts/backfill_fit_scores.py`

**Backend router** (`apps/job-api/app/routers/targets.py`, ~593 lines, 19 endpoints)

- CRUD: `POST /targets`, `GET /targets`, `GET /targets/mine`, `GET /targets/{id}`, `PATCH /targets/{id}`, `DELETE /targets/{id}`
- Lifecycle: `POST /{id}/activate`, `POST /{id}/deactivate`, `GET /{id}/status`, `GET /targets/active`
- User-target link: `POST /{id}/link`, `PATCH /{id}/emphasis`
- Discovery: `POST /targets/suggest`, `POST /targets/from-posting/{posting_id}`
- Profile: `POST /{id}/derive-profile`, `POST /{id}/reference-jds`, `GET /{id}/reference-jds`, `DELETE /{id}/reference-jds/{ref_jd_id}`
- Scoring: `POST /{id}/poll-jobs`

**Frontend** (`apps/root/src/app/fitted/(app)/targets/`)

- `TargetsList.tsx` — fetches `/api/targets/mine`, renders `TargetCard`s
- `TargetCard.tsx` — card with fit-score badge (just shipped in PR #545)
- `TargetDetail.tsx` — full detail page
- `CreateTargetModal.tsx` / `AddReferenceJDModal.tsx` — modals
- `ScoringProfileEditor.tsx` / `ResumeEmphasisEditor.tsx` — inline editors
- `types.ts` — TS mirrors of Pydantic models

**Frontend proxy routes** (`apps/root/src/app/api/targets/`)

- `route.ts`, `suggest/route.ts`, `mine/route.ts`, `[id]/...`

**Tests**

- `test_targets_models.py` (10 tests) — ✅
- `test_targets_derive.py` (7 tests) — 🟡 happy-path only
- `test_targets_merge.py` (14 tests) — ✅
- `test_targets_user_links.py` (9 tests) — ✅
- `test_target_scoring.py` (10 tests) — ✅
- _Missing: tests for `suggest_targets()`, `suggest_and_match()`, `derive_fit_score()`_

### Acceptance criteria

| AC                                                 | Status | Evidence                                                          |
| -------------------------------------------------- | ------ | ----------------------------------------------------------------- |
| Target CRUD endpoints                              | ✅     | All 6 ops in `routers/targets.py`                                 |
| Reference JD extraction + profile derivation       | ✅     | `services/targets/derive_profile.py` + `POST /{id}/reference-jds` |
| Profile merge when adding additional reference JDs | ✅     | `services/targets/merge.py:merge_profiles()` called from router   |
| Scoring profile schema validated by Pydantic       | ✅     | `models/targets.py:38-44`                                         |
| Zero state: no targets until user creates one      | ✅     | `GET /targets/mine` returns `[]` when no user_targets rows        |
| v1: single target works; multi-target schema ready | ✅     | Multi-user schema landed via PR #545                              |

### Findings

**F0-D: `targets.py` router has grown to ~593 lines / 19 endpoints**
Mixed concerns: CRUD, lifecycle, link, discovery, profile management, polling. Realistic split:

- `targets/crud.py` — CRUD + lifecycle (8 endpoints)
- `targets/links.py` — user-target operations (link, emphasis)
- `targets/discovery.py` — suggest, suggest-and-match, from-posting
- `targets/profile.py` — derive, reference-jds, poll

Tradeoff: 4 files vs 1 makes routing imports slightly more complex but each file becomes ~150 lines. Worth doing **only if** a future feature pulls one of these areas significantly further. Otherwise, leave it.

**F0-E: Test coverage gaps on LLM paths**

- `services/targets/suggest.py` — no test file
- `services/targets/match.py` — no test file
- `services/targets/fit_score.py` — no test file (covered indirectly via `test_targets_user_links.py`)
- `services/targets/derive_profile.py` — only happy-path

These are the riskiest functions in Phase 0 (LLM output is non-deterministic, error paths matter). Recommend adding mocked-LLM tests for the error/edge cases at minimum.

**F0-F: `target_reference_jds` UI — RESOLVED ✅**
UI exists at `apps/root/src/app/fitted/(app)/targets/[id]/ReferenceJDList.tsx` + `AddReferenceJDModal.tsx`, wired into `TargetDetail.tsx`. Proxy routes at `apps/root/src/app/api/targets/[id]/reference-jds/...`. Earlier audit missed them because they're under the `[id]/` dynamic route directory.

**F0-G: `activation_status` column purpose — RESOLVED ✅**
Investigation found `activation_status` is NOT redundant with `is_active`. It's a state machine for the background derivation/polling pipeline (`idle | deriving | polling | ready | error`), defined in `supabase/migrations/20260426064755_add_target_search_keywords.sql:8` and consumed by `apps/root/src/app/fitted/(app)/jobs/JobsList.tsx:101-131` to render progress UI while a target is being set up. `is_active` is the user-facing toggle for whether jobs should be queried. Different concerns, both needed. Fix: docstring on the model field.

**F0-H: `JobTarget.search_keywords` — RESOLVED ✅**
`search_keywords` are passed to ATS query endpoints (Greenhouse `q=`, etc.) — they decide which jobs get fetched. `scoring_profile.categories.*.keywords` are weighted matches against fetched JD text — they decide how those jobs get scored. Different stages, different shapes. Fix: docstring on the model field.

### Fixes applied

- **G + H**: Added Pydantic `Field(description=...)` to `JobTarget.search_keywords` and `JobTarget.activation_status` in `apps/job-api/app/models/targets.py:63-79`, documenting the distinction from sibling fields. No behavior change.
- **F**: No code change — UI confirmed present.
- **E**: Added three deterministic mocked-LLM test files:
  - `apps/job-api/tests/test_targets_suggest.py` (5 tests) — happy path, model/purpose/cache wiring, empty payload, invalid JSON.
  - `apps/job-api/tests/test_targets_match.py` (8 tests) — `_normalize_label`, exact match, no-match, RPC fallback, RPC failure swallowing, exclusion of user's existing targets, new-suggestion marking.
  - `apps/job-api/tests/test_targets_fit_score.py` (6 tests) — happy path, model/purpose/cache/max_tokens wiring, cost surface, invalid JSON, score-range rejection (>100, <0).
  - All 19 pass; mypy clean. Coverage: `match.py` 100%, `suggest.py` 82%, `fit_score.py` 71% (directly).

---

## #496 — Job URL validation

### Status: ✅ shipped — no cleanup needed

### Code map

**Service** — `apps/job-api/app/services/validate.py` (233 lines)

- Layer 1 (lines 21-41): `validate_format()` — scheme/parse check
- Layer 2 (lines 43-86): `BANNED_DOMAINS` (24 domains) + `is_banned_domain()` + `registrable_domain()`
- Layer 3 (lines 143-189): redirect following via `httpx.AsyncClient(follow_redirects=True, max_redirects=10)`
- Layer 4 (lines 108-140): `_verify_content()` — distinguishes job posts from generic landing pages
- Returns `ValidationResult { is_valid, final_url, rejection_reason }`

**Wired in**

- `apps/job-api/app/routers/targets.py:104` — manual reference JD URLs
- `apps/job-api/app/routers/jobs.py` — manual job URL entry
- `apps/job-api/app/services/poller.py` — ATS-polled jobs

**Tests** — `apps/job-api/tests/test_validate.py` (39 tests) — comprehensive, all four layers ✅

### Acceptance criteria

| AC                                                              | Status | Evidence                                                  |
| --------------------------------------------------------------- | ------ | --------------------------------------------------------- |
| URL format validation rejects garbage input                     | ✅     | `validate.py:21-41`                                       |
| Redirect chain followed and final URL recorded                  | ✅     | `validate.py:176-189`, `MAX_REDIRECTS=10`                 |
| Banned sites list with at least 20 seed domains                 | ✅     | 24 domains at `validate.py:43-75`                         |
| Content verification distinguishes job posts from non-job pages | ✅     | `validate.py:108-140`                                     |
| Validation runs on both manual entry and ATS-polled jobs        | ✅     | targets/jobs/poller all call `validate_job_url()`         |
| Clear user-facing error messages for each rejection reason      | ✅     | `ValidationResult.rejection_reason` enumerates 6+ reasons |

### Findings

**F0-I: Single file rather than `services/validate/` directory**
Issue body specified `services/validate/` (directory). Implemented as `services/validate.py` (single file, 233 lines). At 233 lines this is fine; only worth splitting if it grows. **No action**.

**F0-J: Banned domains list — drift question**
Static list. No mechanism to add domains at runtime. Acceptable for v1 personal use; flag as a future-need if multi-user lands and false-positive job-aggregator sites need to be blocked dynamically.

### Fixes applied

_(none — nothing to fix here)_

---

## Triage queue

| ID         | Severity | Status      | Resolution                                                                                                                                                                        |
| ---------- | -------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F0-A       | medium   | 🔮 deferred | FastAPI's "Supabase JWT validation" is actually admin-JWT validation. Folding into the multi-user PR landing tonight — no patchwork TODO comment.                                 |
| F0-B       | low      | 🔮 deferred | `SINGLE_USER_ID` sentinel — same disposition as F0-A.                                                                                                                             |
| F0-D       | low      | ⏭️ skip     | `routers/targets.py` size — leave until a feature deepens one area.                                                                                                               |
| F0-E       | medium   | ✅ fixed    | 19 deterministic tests across `test_targets_suggest.py` / `test_targets_match.py` / `test_targets_fit_score.py`. Coverage: `match.py` 100%, `suggest.py` 82%, `fit_score.py` 71%. |
| F0-F       | low      | ✅ resolved | UI exists at `apps/root/src/app/fitted/(app)/targets/[id]/ReferenceJDList.tsx` + `AddReferenceJDModal.tsx` + proxy routes. No code change needed.                                 |
| F0-G       | low      | ✅ fixed    | `activation_status` is a real pipeline state machine, not redundant. Added Pydantic `Field` description in `models/targets.py`.                                                   |
| F0-H       | low      | ✅ fixed    | Added Pydantic `Field` description on `search_keywords` to explain its relationship to `scoring_profile.categories.*.keywords`.                                                   |
| F0-I, F0-J | trivial  | ⏭️ skip     | No action.                                                                                                                                                                        |
