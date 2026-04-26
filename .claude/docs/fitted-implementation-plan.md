# Fitted Implementation Plan

Ordered from easiest to most challenging. Items marked with a decision icon need Daniel's input before starting.

## Tier 1: Quick Fixes (frontend-only, no new architecture)

### 1.1 ~~Fix gap threshold mismatch (50% → 45%)~~ DONE

- Backend `_pct_to_tier()` threshold changed from 50% to 45%. Dashboard alert updated. Blueprint's 5-tier scale was aspirational — backend uses 3 tiers (red/yellow/green), frontend aligned.

### 1.2 ~~Add expanded job lifecycle statuses~~ DONE

- Frontend already had all statuses. Backend `StatusUpdate` Literal updated to accept `resume_ready`, `interviewing`, `offer`.

### 1.3 ~~Verify skip button in onboarding~~ DONE (no changes needed)

- Skip button present on every step except CompletionScreen (final screen, correct behavior).

## Tier 2: Wiring & Verification (endpoints exist, need frontend connection)

### 2.1 ~~Verify .docx export end-to-end~~ DONE (no changes needed)

- Fully implemented: `GET /tailor/resumes/{id}/download` (individual) + `POST /tailor/resumes/export-zip` (bulk). Frontend download button wired in ResumeEditor. Zip export wired in BatchActionBar.

### 2.2 ~~Verify batch size limits~~ DONE

- Backend enforces max 20 via Pydantic. Added frontend warning at >5 selections ("Large batch — may take a while") and disabled Generate button at >20 ("Max 20 per batch").

### 2.3 ~~Surface LLM cost per resume~~ DONE

- `TailoredResumeRecord` already had `cost_usd`, `model`, `input_tokens`, `output_tokens`, `latency_ms`. Added metadata bar to ResumeEditor showing cost, token count, model, and latency.

## Tier 3: Medium Features (new UI, existing backend patterns)

### 3.1 ~~Target-suggested cloud in main targets UI~~ DONE

- Added "Suggest" button to targets page header and zero state. Calls `POST /api/targets/suggest`, displays suggestion cards with label, description, core skills, and one-click "Create Target" action.

### 3.2 ~~Action history / status timeline per job~~ DONE

- Added `GET /jobs/{posting_id}/status-history` backend endpoint querying `job_status_log`. Added proxy route. JobDetailPanel now shows a compact timeline (last 5 entries) after the status buttons, auto-refreshes on status change.

### 3.3 ~~Zip export for batch resumes~~ DONE (no changes needed)

- Already implemented: `POST /tailor/resumes/export-zip` backend endpoint + "Export approved (.zip)" button in BatchActionBar.

## Tier 4: Significant Features (new backend + frontend work)

### 4.1 🔵 Inline annotations in prose doc

- **Blueprint**: Users add inline comments like "Don't include my helpdesk role on engineering resumes". Parsed into structured metadata during derivation.
- **Needs input**: Annotation syntax (markdown comments? custom markers?), how they display in the prose editor, how derivation parses them.
- **Work**: Extend prose editor with annotation support. Backend derivation must parse and respect annotations.

### 4.2 🔵 Job URL validation

- **Blueprint**: Format validation, redirect detection, banned sites, content verification
- **Needs input**: Banned sites seed list, validation strictness (warn vs block), where validation runs (on manual entry? on all polled jobs?).
- **Work**: New `services/validate/` backend service. Frontend shows validation results on manual entry and in job detail.

### 4.3 🔵 Resume reuse within a target

- **Blueprint**: Reference existing resume for similar jobs in same target. Fallback to master doc if variance too high.
- **Needs input**: Similarity threshold, UX for "reuse this resume" vs "generate fresh", how variance is measured.
- **Work**: Backend similarity check + resume cloning. Frontend prompt in batch generation flow.

### 4.4 🔵 Firecrawl fallback for URL extraction

- **Blueprint**: HTTP fetch → Firecrawl → warn user
- **Needs input**: Firecrawl API key/account, timeout values, which career page patterns trigger the fallback.
- **Work**: Backend cascade in ingest service. Frontend loading state + fallback warning.

## Tier 5: New Feature Areas (require design decisions + multi-service work)

### 5.1 🔵 Email notifications (Resend)

- **Blueprint**: High-score job alerts via email. Threshold-based, user-configurable, per-target.
- **Needs input**: Default threshold, notification frequency (immediate? daily digest?), email template design, opt-in/opt-out UX.
- **Work**: New `services/notify/` backend service. Notification preferences UI. Email templates. Cron/trigger for sending.

### 5.2 🔵 SMS notifications (Twilio)

- **Blueprint**: Great-fit jobs get a text with deep link. User clicks → logged in → sees job → can generate resume.
- **Needs input**: Twilio account, phone number collection UX, deep link format, cost per SMS acceptable.
- **Work**: Twilio integration. Phone number in user profile. SMS templates. Same trigger as email but different channel.

### 5.3 🔵 v2 LLM-powered scoring

- **Blueprint**: Claude API-powered scoring to supplement/replace keyword matching
- **Needs input**: Which model, scoring prompt design, how it integrates with keyword scoring (replace or blend), cost implications.
- **Work**: LLM scoring service. Score caching. UI to show LLM vs keyword scores.
