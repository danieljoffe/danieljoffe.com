# Fitted Implementation Plan

Ordered from easiest to most challenging. Items marked with a decision icon need Daniel's input before starting.

## Tier 1: Quick Fixes (frontend-only, no new architecture)

### 1.1 Fix gap threshold mismatch (50% → 45%)

- **Blueprint**: Resume generation gate at 45%, 5-tier color scale
- **Current**: UI warns at 50%, only 3 tiers (red/yellow/green)
- **Work**: Update alert threshold to 45% in `DashboardPage.tsx`. Add orange and lime tiers to `GapTier` type and tier mapping helpers. Verify backend `gap_tracker.py` uses the same 5-tier scale.
- **Files**: `DashboardPage.tsx`, `profile/types.ts`

### 1.2 Add expanded job lifecycle statuses

- **Blueprint**: `new → saved → resume_draft → resume_ready → applied → interviewing → offer → rejected → archived`
- **Current**: Only `new`, `saved`, `applied`, `rejected`, `archived`
- **Work**: Add `resume_draft`, `resume_ready`, `interviewing`, `offer` to status type/options in frontend. Verify backend `status_log` supports them. Update status dropdown and any status filters.
- **Files**: Jobs status types, `JobsListTable.tsx`, status filter options

### 1.3 Verify skip button in onboarding

- **Blueprint**: "A skip button is always available"
- **Work**: Read onboarding wizard, confirm skip exists on every step. Add if missing.
- **Files**: `OnboardingWizard.tsx`

## Tier 2: Wiring & Verification (endpoints exist, need frontend connection)

### 2.1 Verify .docx export end-to-end

- **Blueprint**: Individual .docx download for approved resumes
- **Work**: Check if backend has a docx rendering endpoint. If yes, wire download button in resume editor. If no, flag as blocked on backend.
- **Files**: Resume editor, jobs API proxy routes

### 2.2 Verify batch size limits

- **Blueprint**: Default 5, warning above 5, larger batches processed in groups
- **Work**: Check backend batch endpoint for limits. Add frontend warning when selecting >5 jobs for generation.
- **Files**: `JobsList.tsx` batch generation UI

### 2.3 Surface LLM cost per resume

- **Blueprint**: Per-resume generation cost (tokens, model, dollars)
- **Work**: Check if `llm_cost_log` is queryable per resume. If so, show cost in resume editor after generation.
- **Files**: Resume editor, potentially new proxy route

## Tier 3: Medium Features (new UI, existing backend patterns)

### 3.1 Target-suggested cloud in main targets UI

- **Blueprint**: Suggested targets derived from master document, not just in onboarding
- **Current**: `TargetSuggestions` only in onboarding wizard
- **Work**: Add a "Suggest targets" action on the targets page that calls the same endpoint. Show suggestions in a modal or inline card.
- **Files**: `TargetsList.tsx`, new suggestion component

### 3.2 Action history / status timeline per job

- **Blueprint**: Every status change, resume generation, and user action logged with timestamps
- **Work**: Check if backend logs status changes. Build a timeline component in job detail panel showing history.
- **Files**: `JobDetailPanel.tsx`, new timeline component, potentially new proxy route

### 3.3 Zip export for batch resumes

- **Blueprint**: Select-all → bundled zip download
- **Work**: Backend needs a zip endpoint (or frontend bundles individual downloads via JSZip). Add "Download All" button to approved resumes view.
- **Files**: Jobs page, new download utility

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
