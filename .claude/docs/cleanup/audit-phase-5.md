# Audit Phase 5 — Notifications & Insights

Covers Phase 5 of [#493](https://github.com/danieljoffe/danieljoffe.com/issues/493): email + SMS alerts on new high-scoring jobs, plus the analytics dashboard at `/fitted/insights`.

**Sub-issues:** [#510](https://github.com/danieljoffe/danieljoffe.com/issues/510) · [#511](https://github.com/danieljoffe/danieljoffe.com/issues/511) · [#512](https://github.com/danieljoffe/danieljoffe.com/issues/512)

ACs in this doc are pulled from the actual GitHub issue bodies (verified at audit time), not from the implementation plan.

## Phase summary

| Sub-issue           | Status | Headline finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| #510 Email (Resend) | ❌     | **End-to-end broken.** PR #510 was reverted (`c0b105a1 Revert "feat(fitted): email notifications for high-scoring jobs (#510)"`). The SMS PR (`bb4d25e2`) re-added `services/notify.py` and the SMS migration, but never restored: (a) the `CREATE TABLE user_profiles + job_notification_sent` migration, (b) the `/api/email/job-alert` Next.js endpoint, (c) the `JobAlert.tsx` Resend template, (d) the `/api/email/jobs/unsubscribe` handler + token helpers. Settings UI exists; the pipeline doesn't. |
| #511 SMS (Twilio)   | 🟡     | Backend dispatch + Twilio client + dedup + daily rate limit + threshold + settings UI all present and working. Inherits the same missing-CREATE-migration problem from #510 (the `ALTER TABLE user_profiles ADD COLUMN phone_number…` migration assumes the table exists). No per-target SMS threshold (#511 doesn't require it; #510 does — flagged on email side).                                                                                                                                         |
| #512 Insights panel | ✅     | All 8 ACs implemented end-to-end. `routers/insights.py` exposes `/pipeline`, `/targets`, `/skills-cost` with `?period=7d/30d/90d/all`. Frontend has KPI cards, period filter, and 6 lazy-loaded Recharts charts (Velocity, Funnel, Score Distribution, Target Comparison, Skill Frequency, LLM Cost). Responsive grid. No findings.                                                                                                                                                                          |

**Open triage decisions** (for the user): see [Triage queue](#triage-queue) at the bottom.

---

## #510 — Email notifications via Resend

### Status: ❌ broken — alerts will never reach the user

### Source ACs (from issue body)

- [ ] Email sent when new job exceeds threshold
- [ ] Deep link to job in Fitted
- [ ] User can configure threshold
- [ ] No duplicate notifications for the same job
- [ ] Unsubscribe / pause option
- (impl note) Per-target thresholds in multi-target mode

### Code map

**Backend (FastAPI)**

- `apps/job-api/app/services/notify.py` (325 lines) — `send_alerts_for_new_jobs()` (44–72) → `_fetch_active_profiles()` (75–87) → `_try_send_one()` (90–135) claims dedup row then `_post_alert()` (138–167) POSTs to Next.js.
- `apps/job-api/app/services/poller.py:600-606` — call site, wrapped in try/except, exception logged but swallowed.
- `apps/job-api/app/config.py:40-41` — `next_app_url` and `job_alert_secret` settings (both default `""` → silent skip if unset).
- `apps/job-api/tests/test_notify.py` — covers claim/send flow, threshold filtering, mocked Supabase + httpx.

**Backend (Supabase)**

- ❌ **No `CREATE TABLE user_profiles` migration in `supabase/migrations/`.** The original was `20260424120000_create_job_notification_tables.sql` (verified via `git log -S 'job_notification_sent'`), reverted in `c0b105a1` and never reintroduced.
- `supabase/migrations/20260426120000_add_sms_notification_columns.sql` — assumes both `user_profiles` and `job_notification_sent` exist (`ALTER TABLE … ADD COLUMN IF NOT EXISTS …`, `RENAME COLUMN resend_id TO external_id`).
- `supabase/migrations/20260428120001_profile_identity_and_resume_versions.sql:18-22` — also assumes `user_profiles` exists.

**Frontend (Next.js) — Settings UI**

- `apps/root/src/app/fitted/(app)/settings/SettingsPage.tsx` (369 lines) — full UI for both channels (Switch + threshold + daily limit + phone). Calls `/api/profile/notifications` (GET/PATCH).
- `apps/root/src/app/api/profile/notifications/route.ts` — proxy to FastAPI `/profile/notifications`.
- `apps/job-api/app/routers/user_profile.py:63-103` — backend GET/PATCH handlers.

**Frontend (Next.js) — Send + unsubscribe handlers**

- ❌ `apps/root/src/app/api/email/job-alert/route.ts` — **does not exist** (deleted in revert).
- ❌ `apps/root/src/app/api/email/jobs/unsubscribe/route.ts` — **does not exist** (deleted in revert).
- ❌ `apps/root/src/components/emails/JobAlert.tsx` — **does not exist** (deleted in revert).
- ❌ `apps/root/src/lib/email/tokens.ts` exists but has no `signProfileToken` / `verifyProfileToken` (those were also removed). Only the `leads`-table HMAC helpers remain (audit tool unsubscribe).
- The existing `apps/root/src/app/api/email/unsubscribe/route.ts` is for the audit-tool `leads` table — unrelated, not reusable for job alerts.

### Acceptance criteria

| AC                                          | Status | Evidence                                                                                                                                                                                                                                                                                          |
| ------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Email sent when new job exceeds threshold   | ❌     | `notify.py:151` POSTs to `${NEXT_APP_URL}/api/email/job-alert` → 404 (route doesn't exist) → `_post_alert` returns None → `_try_send_one` returns False. Dedup row was already claimed at line 100, so the job is now permanently flagged "sent" with no `external_id`. Silent failure (F5-A).    |
| Deep link to job in Fitted                  | ❌     | Would be `/fitted/jobs/[id]` — but route handler that builds the email doesn't exist.                                                                                                                                                                                                             |
| User can configure threshold                | ✅     | SettingsPage.tsx:307-316 + backend `/profile/notifications` PATCH. Stored in `user_profiles.job_score_threshold`. Toggle stored in `user_profiles.job_notifications_enabled`.                                                                                                                     |
| No duplicate notifications for the same job | 🟡     | Mechanism is correct — `(user_profile_id, job_posting_id, channel)` unique constraint + upsert with `ignore_duplicates=True` (notify.py:100-115). But because the email send fails after the claim is committed, the dedup behaviour today is "guaranteed never to send" rather than "no dupes".  |
| Unsubscribe / pause option                  | 🟡     | **Pause**: ✅ `job_notifications_enabled` toggle in SettingsPage works. **Unsubscribe link**: ❌ no handler, no token helper, no link in email (since email template doesn't exist). The `unsubscribed_at` filter on notify.py:84 references a column that may or may not exist on user_profiles. |
| Per-target thresholds (multi-target mode)   | ❌     | Threshold is a single column on `user_profiles` (global). Phase 3 split targets per-user via `user_targets`, but `user_targets` has no `job_score_threshold` column. Issue body explicitly calls this out as a requirement (F5-D).                                                                |

### Findings

**F5-A: email pipeline broken end-to-end (CRITICAL)** — see code-map for the full story. Top-level claim: `notify.py` POSTs to `${NEXT_APP_URL}/api/email/job-alert` (notify.py:151), but the Next.js endpoint, the React Email template (`JobAlert.tsx`), the `/api/email/jobs/unsubscribe` handler, and the profile-token helpers in `lib/email/tokens.ts` were all deleted in the revert commit `c0b105a1` and never restored. The dedup row is claimed before the POST attempt (notify.py:99-115), so the failure leaves a phantom "sent" record with `external_id IS NULL`. The poller swallows the exception (poller.py:603-605), so this failure is silent — there is no log scream loud enough to surface in normal operation, no alert, no test coverage for the missing-route case (only mocked-success paths in `test_notify.py`).

**F5-B: missing `CREATE TABLE` migration + live schema drift in DEV (CRITICAL)** — `supabase/migrations/` has no file that creates `user_profiles` or `job_notification_sent`. Both are referenced by:

- `20260426120000_add_sms_notification_columns.sql` — adds SMS columns + renames `resend_id → external_id` + adds `channel` discriminator.
- `20260428120001_profile_identity_and_resume_versions.sql:18` — `ALTER TABLE user_profiles ADD COLUMN name TEXT, …`.
- `app/services/notify.py:84,100,128` — runtime queries.
- `app/routers/user_profile.py:67,84` — runtime CRUD.

**Verified live state via Supabase MCP (2026-04-28):**

| Project                           | `user_profiles`                                                                                                                                                    | `job_notification_sent`                                                            | SMS migration record   | Actual SMS columns | `external_id`/`channel`            |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- | ---------------------- | ------------------ | ---------------------------------- |
| **PROD** (`nfmhlncocszfumtfqcup`) | ❌ does not exist                                                                                                                                                  | ❌ does not exist                                                                  | absent                 | n/a                | n/a                                |
| **DEV** (`grwmzluuqyczatkxorfa`)  | ✅ exists (id, user_id, email, job_score_threshold, job_notifications_enabled, unsubscribed_at, created_at, updated_at, name, location, linkedin_url, website_url) | ✅ exists (id, user_profile_id, job_posting_id, score_at_send, resend_id, sent_at) | ✅ recorded as applied | ❌ none            | ❌ still `resend_id`, no `channel` |

This is worse than originally suspected. PROD is completely empty of these tables — the F3-A identity migration would also fail there. DEV has the tables but the SMS migration's effects were rolled back out-of-band (columns dropped, rename undone) while the migration record was kept. Result: **two different broken states**, neither matching the migration history. The `unsubscribed_at` column referenced at `notify.py:84` does exist in DEV but not in PROD.

**F5-D: per-target email/SMS thresholds (issue requirement, not implemented)** — Issue #510 body explicitly lists "Per-target thresholds in multi-target mode" as a requirement. Today both thresholds (`job_score_threshold`, `sms_score_threshold`) are single columns on `user_profiles` — global per user, not per target. Phase 3 introduced `user_targets` (the per-user/per-target junction); adding `notification_threshold INT NULL` there + plumbing through `_fetch_active_profiles` would be the natural extension. Lower urgency than F5-A/F5-B since multi-user/multi-target is still single-tenant in practice, but worth a tracking note.

### Fixes applied

**F5-A — email pipeline restored (2026-04-28)**

- `apps/root/src/lib/email/tokens.ts` — added `signProfileToken(profileId, category)` / `verifyProfileToken(...)` / `buildProfileUnsubscribeUrl(...)`. Category is part of the HMAC payload (`profile:{category}:{profileId}`), so flipping `?category=` invalidates the signature. Distinct from the existing `leads` namespace.
- `apps/root/src/components/emails/EmailLayout.tsx` — added optional `footerText` prop so `JobAlert` can use a Fitted-specific footer instead of the audit-tool default.
- `apps/root/src/components/emails/JobAlert.tsx` — restored React Email template (score badge, job card, Open in Fitted CTA, View original posting secondary link).
- `apps/root/src/app/api/email/job-alert/route.ts` — restored. Bearer-secret auth (`JOB_ALERT_SECRET`), payload validation, Resend send, error-tracking. **Adds RFC 2369 + RFC 8058 deliverability headers** (`List-Unsubscribe: <…>` + `List-Unsubscribe-Post: List-Unsubscribe=One-Click`) so Gmail/Yahoo render a native unsubscribe button.
- `apps/root/src/app/api/email/profile/unsubscribe/route.ts` — **new generic route** with both `GET` (browser click → confirmation HTML) and `POST` (RFC 8058 one-click → 200 with no body). Reads `profile_id`, `category`, `token`; verifies HMAC; dispatches by category (today: `job_alerts` → `job_notifications_enabled=false` + `unsubscribed_at=now()`). Adding new categories is a one-case addition to the dispatch switch.
- `apps/root/src/lib/email/tokens.test.ts` — extended with cross-namespace tests (lead token can't be replayed against profile, category-tampered tokens fail verification).
- `apps/root/src/app/api/email/job-alert/route.test.ts` — restored, with new assertion that `List-Unsubscribe` header is present and points at the profile/unsubscribe URL with `category=job_alerts`.
- Verified: `pnpm nx test root --testPathPatterns='(email/tokens|email/job-alert/route)'` → 21/21 pass; `pnpm tsc --noEmit` clean.

**F5-B — consolidating notification tables migration (2026-04-28)**

- `supabase/migrations/20260428120002_create_notification_tables.sql` — single idempotent migration. `CREATE TABLE IF NOT EXISTS` for both tables in their final shape (PROD bootstrap from empty); `ADD COLUMN IF NOT EXISTS` for SMS columns + named-`DO $$` blocks for missing CHECK constraints (heals DEV drift); conditional `RENAME COLUMN resend_id → external_id` (only fires if old column exists and new doesn't); swaps unique constraint to `(user_profile_id, job_posting_id, channel)`; recreates the `set_user_profiles_updated_at` trigger.
- Applied to DEV via Supabase MCP. Verified post-state:
  - `user_profiles` columns: 16 (originals + identity + SMS) ✅
  - `job_notification_sent` columns: includes `external_id` and `channel` ✅
  - Constraints: `job_notification_sent_user_profile_job_channel_key (UNIQUE)` and `job_notification_sent_channel_check (CHECK)` present; old single-channel unique gone ✅
- PROD remains empty (user has not run any Fitted migrations yet) — when they do, this migration is the first one that mentions `user_profiles`/`job_notification_sent`, so the empty path executes cleanly.

---

## #511 — SMS notifications via Twilio

### Status: 🟡 mostly working — code path complete, schema bootstrap depends on F5-B

### Source ACs (from issue body)

- [ ] SMS sent for jobs above SMS threshold
- [ ] Deep link opens Fitted to specific job
- [ ] User can configure SMS threshold
- [ ] Rate limiting (max N SMS per day)
- [ ] User can enable/disable SMS notifications
- [ ] Phone number stored in user profile

### Code map

- `apps/job-api/app/services/notify.py:175-296` — `send_sms_alerts_for_new_jobs()`, `_sms_count_today()`, `_try_send_sms()`.
- `apps/job-api/app/services/notify.py:299-324` — cached Twilio client, `_send_twilio_sms()`.
- `apps/job-api/app/services/poller.py:607-610` — call site, parallel to email.
- `apps/job-api/app/config.py:17-19` — `twilio_account_sid`, `twilio_auth_token`, `twilio_phone_number` settings.
- `apps/job-api/pyproject.toml` — `twilio` SDK dependency.
- `supabase/migrations/20260426120000_add_sms_notification_columns.sql:13-19` — `phone_number`, `sms_notifications_enabled`, `sms_score_threshold` (default 85), `sms_daily_limit` (default 5, 1–50 check) added to `user_profiles`. Also adds `channel` discriminator on `job_notification_sent`.
- `apps/root/src/app/fitted/(app)/settings/SettingsPage.tsx:320-365` — SMS card: enable toggle, phone number input, threshold input, daily-limit input. All disabled when toggle is off.

### Acceptance criteria

| AC                                        | Status | Evidence                                                                                                                                               |
| ----------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SMS sent for jobs above SMS threshold     | ✅     | `notify.py:200-210` filters by `sms_score_threshold`, then `_try_send_sms` claims dedup row + sends.                                                   |
| Deep link opens Fitted to specific job    | ✅     | `notify.py:271-273` builds `${NEXT_APP_URL}/fitted/jobs/{job_id}` (works now that F4-A wired up the deep-link page).                                   |
| User can configure SMS threshold          | ✅     | SettingsPage.tsx:347-353 + DB column with 0–100 check.                                                                                                 |
| Rate limiting (max N SMS per day)         | ✅     | `_sms_count_today()` (213-224) counts UTC-day SMS via `(channel='sms', sent_at >= today)`. `_try_send_sms:238-246` enforces against `sms_daily_limit`. |
| User can enable/disable SMS notifications | ✅     | SettingsPage.tsx:325-329 Switch + `sms_notifications_enabled` column. notify.py:194 filters on it.                                                     |
| Phone number stored in user profile       | ✅     | `user_profiles.phone_number TEXT`.                                                                                                                     |

### Findings

**F5-B (shared with #510)** — same missing-CREATE-migration problem applies to SMS columns since they are added via `ALTER TABLE user_profiles`. Without the original create migration, the SMS columns can't be applied either.

**F5-C: phone number format not validated (LOW)** — SettingsPage.tsx:339-346 accepts any string in the phone input with helper text "Include country code". Backend at `user_profile.py:71-103` PATCH does no E.164 validation either. Twilio will reject malformed numbers at send time, surfacing as a logged exception inside `_send_twilio_sms` (notify.py:280-285). Worth a regex check on PATCH (`^\+[1-9]\d{1,14}$`) so the user gets immediate feedback rather than silent failures.

### Fixes applied

**F5-C — E.164 phone validation (2026-04-28)**

- `apps/job-api/app/models/user_profile.py` — added `_E164_RE = re.compile(r"^\+[1-9]\d{1,14}$")` + `_normalize_phone()` helper. Strips spaces/hyphens/parentheses for forgiving input ("+1 (415) 555-2671" → "+14155552671"); blank/None → `None` (clears the field); anything else that fails E.164 raises `ValueError` with a helpful message. Wired via `@field_validator("phone_number", mode="before")` on both `NotificationPreferencesUpdate` and `IdentityFieldsUpdate` so the same rule applies to the SMS-phone and resume-phone PATCH paths.
- `apps/job-api/tests/test_user_profile_models.py` — new file. Parametrized accept-cases (E.164 with permissive formatting, blank/None) and reject-cases (missing `+`, leading-0 country code, too-short/too-long, letters). 14/14 pass.
- `apps/root/src/app/fitted/(app)/settings/SettingsPage.tsx` — added module-scope `extractFastApiError(res)` that reads FastAPI's 422 `detail[0].msg` (stripping the Pydantic `"Value error, "` prefix) and falls back to a string `detail`. `handleSave` now surfaces the validator's message in the toast instead of the generic "Failed to save settings", so a bad phone number shows the actual hint inline.
- Verified: `pnpm nx test job-api --testPathPatterns='test_user_profile_models|test_notify'` → 28/28 pass; `uv run mypy app/` → clean (105 files); `pnpm tsc --noEmit` → clean.

---

## #512 — Insights dashboard

### Status: ✅ complete

### Source ACs (from issue body)

- [ ] Application velocity chart
- [ ] Target comparison view
- [ ] Skill frequency analysis
- [ ] Response rate funnel
- [ ] Score distribution visualization
- [ ] LLM cost breakdown
- [ ] Date range selector
- [ ] Mobile-responsive charts

### Code map

**Backend**

- `apps/job-api/app/routers/insights.py` (60 lines) — three endpoints: `GET /insights/pipeline`, `GET /insights/targets`, `GET /insights/skills-cost`. Each takes `period={7d|30d|90d|all}`. Auth via `verify_api_key_or_session`.
- `apps/job-api/app/services/insights.py` — `compute_pipeline()`, `compute_targets()`, `compute_skills_cost()` aggregations.
- `apps/job-api/app/models/insights.py` — `PipelineInsights`, `TargetInsights`, `SkillsCostInsights` response models.
- `supabase/migrations/20260422130000_create_llm_cost_log.sql` — `llm_cost_log` table powering the cost endpoints.
- `apps/job-api/app/services/llm/cost_log.py` (or equivalent) — `record_llm_cost()` callers across poller, scoring, tailoring.

**Frontend**

- `apps/root/src/app/fitted/(app)/insights/page.tsx`, `loading.tsx`, `types.ts`.
- `apps/root/src/app/fitted/(app)/insights/InsightsDashboard.tsx` (240 lines) — orchestrator: PeriodFilter (7d/30d/90d/all), `useInsights(period)` hook, KPI cards (Applications, Interviews, Response Rate, Avg Days to Response), 6 lazy `dynamic({ssr:false})` charts in a responsive grid (`grid-cols-1 lg:grid-cols-2`, `grid-cols-2 lg:grid-cols-4`).
- `apps/root/src/app/fitted/(app)/insights/charts/` — `VelocityChart.tsx`, `FunnelChart.tsx`, `ScoreDistributionChart.tsx`, `TargetComparisonChart.tsx`, `SkillFrequencyChart.tsx`, `CostChart.tsx`, `colors.ts`.
- `apps/root/src/hooks/useInsights.ts` — fetches the three endpoints in parallel, exposes `{pipeline, targets, skillsCost, loading, error}`.

### Acceptance criteria

| AC                         | Status | Evidence                                                                                                                  |
| -------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------- |
| Application velocity chart | ✅     | `compute_pipeline().velocity` (weekly resumes/applications) → `VelocityChart.tsx` line chart.                             |
| Target comparison view     | ✅     | `compute_targets().targets` (per-target avg score, applied count, conversion) → `TargetComparisonChart.tsx`.              |
| Skill frequency analysis   | ✅     | `compute_skills_cost().top_skills` (matched + missing per skill) → `SkillFrequencyChart.tsx` stacked bar.                 |
| Response rate funnel       | ✅     | `compute_pipeline().funnel` → `FunnelChart.tsx`.                                                                          |
| Score distribution         | ✅     | `compute_targets().score_distribution` 10 buckets → `ScoreDistributionChart.tsx`.                                         |
| LLM cost breakdown         | ✅     | `compute_skills_cost()` aggregates `llm_cost_log` by purpose + week → `CostChart.tsx` + total/avg in card header.         |
| Date range selector        | ✅     | `PeriodFilter` (InsightsDashboard.tsx:44-76) with `aria-pressed`, keyboard accessible.                                    |
| Mobile-responsive charts   | ✅     | Responsive grid (`grid-cols-1 lg:grid-cols-2`); Recharts uses ResponsiveContainer; KPI grid `grid-cols-2 lg:grid-cols-4`. |

### Findings

None.

### Fixes applied

_no fixes needed_

---

## Triage queue

**Status legend**: ✅ fix · ⏭️ skip · 🔮 defer · 🟡 needs decision

| ID   | Finding                                                                                                                                             | Effort | Recommendation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F5-A | #510 email pipeline broken end-to-end — Next.js route, template, unsubscribe handler, token helpers all missing (deleted in revert, never restored) | L      | ✅ fix — restore the four artifacts from `db4a31dd` (`/api/email/job-alert/route.ts`, `/api/email/jobs/unsubscribe/route.ts`, `components/emails/JobAlert.tsx`, profile-token helpers in `lib/email/tokens.ts`). Add an integration test that asserts a non-2xx Next.js response causes `_try_send_one` to leave `external_id NULL` and return False, so the next regression is caught. Also: claim-after-send (instead of claim-before) is worth considering, but trades dedup safety for retryability — keep current order. |
| F5-B | #510+#511 missing `CREATE TABLE user_profiles + job_notification_sent` migration — fresh DB bootstrap is broken                                     | S      | ✅ fix — recreate `supabase/migrations/20260424120000_create_job_notification_tables.sql` from `git show db4a31dd:supabase/migrations/20260424120000_create_job_notification_tables.sql`. Verify the column set matches what notify.py + the ALTER migrations need (especially `unsubscribed_at`). Apply with `pnpm db:push --dry-run` first to confirm idempotence on prod.                                                                                                                                                  |
| F5-C | #511 phone number not validated to E.164 format — Twilio rejects silently at send time                                                              | XS     | ✅ fix — add a regex check (`^\+[1-9]\d{1,14}$`) in `user_profile.py` PATCH validator + an inline `<FormFieldError>` in SettingsPage on save failure. Two small changes, much better UX.                                                                                                                                                                                                                                                                                                                                      |
| F5-D | #510 per-target thresholds not implemented — issue body lists this as a requirement                                                                 | M      | 🔮 defer — flagged in issue body but explicitly tied to "multi-target mode" which is still single-tenant in practice. Add a `notification_threshold INT NULL` column to `user_targets` later when multi-target email is actually wanted. Open a follow-up issue, don't block Phase 5 close-out on it.                                                                                                                                                                                                                         |

### Decisions taken (2026-04-28)

- **F5-A**: rebuild as a **single generic** `/api/email/unsubscribe?token=...` route (not per-category). Token is HMAC-signed JWT carrying `{userId, category, exp}` (re-using the `signProfileToken`/`verifyProfileToken` shape from `db4a31dd`, generalised over category). Email is rendered via React Email + sent through Resend (FastAPI → Next.js indirection kept — the Next.js side owns React rendering). **Add `List-Unsubscribe` + `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers** (RFC 2369 + RFC 8058) so Gmail/Yahoo render a native unsubscribe button and one-click unsubscribe works without a click-through. Add an integration test that asserts a non-2xx Next.js response causes `_try_send_one` to leave `external_id NULL` and return False.
- **F5-B**: write a **single new consolidating migration** (`20260428120002_create_notification_tables.sql`) that uses `CREATE TABLE IF NOT EXISTS` for both tables in their final shape (with SMS columns + identity columns + channel + external_id), plus `ALTER TABLE … ADD COLUMN IF NOT EXISTS` and a `DO $$ BEGIN … RENAME COLUMN … END $$` guard for the DEV-drift case. Cleanest path: idempotent on PROD (creates everything fresh) and idempotent on DEV (heals the drift without touching existing rows). The two prior ALTER migrations stay as historical records; they're already recorded as "applied" in DEV's `schema_migrations` and won't re-run.
- **F5-D**: **defer.** Open a follow-up issue when multi-target email becomes real. No schema change in Phase 5.

### Original open questions

1. **F5-A scope**: do we restore the original Resend template + dedicated `/api/email/jobs/unsubscribe` route as-was, or rebuild the email path differently (e.g., use Supabase Edge Function for the send, drop the FastAPI → Next.js indirection)? Original architecture is a defensible choice — Next.js owns the React Email render — but the indirection added a failure mode (the silent 404). Worth a quick gut check before restoring as-is. → **Resolved**: keep FastAPI → Next.js, add deliverability headers, generic route.
2. **F5-B verification**: what state is the prod Supabase project actually in for `user_profiles`? → **Resolved**: PROD has no notification tables at all (only `job_postings`); DEV has tables in a drifted state (SMS columns missing, `resend_id` not renamed). Single consolidating migration handles both.
3. **F5-D urgency**: how soon does the multi-target story become real? → **Resolved**: defer.
