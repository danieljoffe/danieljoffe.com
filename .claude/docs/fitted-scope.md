# Fitted — Product Scope

Personal job search tool that ingests roles from any source, scores and analyzes them with LLM, generates tailored one-page resumes as editable drafts, and tracks the full application lifecycle. Polished enough to demo or eventually charge for.

## Core Workflow

```
Open Fitted → review latest batch of scored roles
  → skim list (score visible at a glance)
  → click into a role → LLM breakdown loads (scorecard + recommendation)
  → archive / delete / close unwanted roles
  → select promising roles for batch resume generation
  → hit "Generate" (enabled when batch has items)
  → resumes generate one-at-a-time as drafts
  → review each draft: edit or approve
  → approved resumes → export as .docx (individual or zip)
  → job status advances through the lifecycle
  → application history feeds an insights panel
```

## Job Posting Lifecycle

```
new → saved → resume_draft → resume_ready → applied → [interview stages] → offer / rejected / archived
```

Current statuses (`new`, `saved`, `applied`, `rejected`, `archived`) need to expand to support the resume generation and interview tracking phases.

## Features

### 1. Job Discovery (exists, needs refinement)

- **ATS polling**: Greenhouse, Lever, Ashby, SmartRecruiters, Workday (all implemented)
- **ATS auto-detect**: URL pattern matching + async probing (implemented)
- **Manual entry**: Paste a job URL → lightweight extraction (URL, salary, location, company, title — no LLM). Listed alongside ATS-polled jobs with a visual differentiator (badge/icon). Deeper LLM analysis only runs on demand when the user clicks in. This keeps manual entry cheap and fast; qualification against the user's experience is demand-driven, not upfront.
- **URL extraction cascade**: HTTP fetch + HTML parsing first. If that fails to extract sufficient data, Firecrawl as fallback (with a short timeout to prevent long waits). If Firecrawl also fails, warn the user that the URL is not parseable. No silent failures.
- **Job URL validation**: All job URLs are validated before being presented to users:
  - URL format validation (reject obvious garbage)
  - Redirect detection (flag URLs that redirect to other job platforms or aggregators)
  - Banned sites list (known scam sites, content farms, expired job aggregators)
  - Content validation (verify the page is actually a job posting, not a blog post or homepage)
  - Manual entries get the same validation as ATS-polled jobs
- **Firecrawl fallback**: For custom career pages without a public API (#407, not yet built). Also used as second-tier extraction when HTTP fetch fails for manual entries.

### 2. Scoring & Analysis

- **Three-stage scoring pipeline** (target-relative, replaced the static keyword scorer):
  - Stage 1: bidirectional keyword aliasing on the job title + first paragraph
  - Stage 2: section-aware JD parser extracts requirements
  - Stage 3: LLM scores against the target's scoring profile, blended 60% keyword / 40% LLM
  - Pipeline is cached, batched, and concurrent (commit `220fe4f8`)
- **List view**: Per-target score column, scoring status indicator (queued / scoring / scored / failed)
- **Detail view**: Scorecard (skills matched/missing, seniority fit, domain fit, recommendation) generated on demand via Analyze button

### 3. Resume Tailoring (core value, #185 — in progress in parallel session)

<!-- TODO: CONTINUE HERE -->

- **Experience document**: Single master document, authored conversationally (#185 onboarding + update chat). The tailor reads the optimized derivative, not the prose directly. The user can add inline annotations to control per-target behavior (e.g. "Don't include my helpdesk role on engineering resumes", "Emphasize the roadmap work for product manager targets"). Annotations are stored as part of the prose and parsed into structured metadata on the optimized doc during derivation.
- **Batch generation**: Select multiple jobs → hit Generate → resumes produce one at a time. Default batch size: 5. Batches above 5 show a warning about processing time. Larger batches are accepted but processed in groups behind the scenes to avoid overwhelming the system.
- **Draft → approve flow**: Each resume generates as a draft. User can free-text edit the entire draft. Approved resumes can be exported as .docx.
- **Export**: Individual .docx download OR select-all → bundled zip. Resumes are saved and attributed to their job posting for later retrieval.
- **Resume reuse within a target**: Once a resume is created for one job in a target, the app can reference that resume to tailor it for another job in the same target. This is faster and cheaper than generating from scratch each time. If the variance between jobs is too large, the app falls back to the master document instead.
- **Resume ↔ job attribution**: A tailored resume can be attributed to many jobs. If two jobs in the same target have similar requirements, one resume may serve both.
- **Page budget**: One page by default, configurable per role
- **Format**: One default template for all targets in v1. Schema supports per-target templates from day one. Future: research optimal resume formats per role type and offer target-specific templates.
- **Cover letters**: Not in v1 but coming soon. Architecture must leave room (shared renderer, `document_type` param)

### 4. Job Targets

A target is a lens the user applies to their entire job search. Each target represents a different role the user is pursuing. Targets are **not presets** — they're derived from real job descriptions or from the user's master document.

- **Target creation — two paths**:

  **Path 1: From a reference JD** (user has a job URL in mind)

  ```
  User pastes a reference JD URL
    → system extracts: role label, key skills, seniority signals, domain keywords
    → system proposes a scoring profile + target summary
    → user reviews: edit or approve
    → target is live, future jobs scored through this lens
  ```

  **Path 2: From the master document** (user is exploring options)

  ```
  Master document is analyzed → app derives a cloud of adjacent role targets
    → user picks from suggested targets
    → system generates a scoring profile for the selected role
    → user reviews: edit or approve
    → target is live
  ```

- **Multiple reference JDs per target**: A target can be refined by submitting additional reference JDs. Each new JD merges into the existing scoring profile, producing a more robust signal than any single example. ("Here are 3 Product Manager postings I'd love — build my target from these.")

- **Role-agnostic**: Targets are not limited to engineering roles. A user pivoting to product management, data science, or any other field can create a target by providing a reference JD for that role. The system derives what matters from the JD itself.

- **Scoring profile schema** (Option B — categorized with weights):

  ```json
  {
    "categories": {
      "core_skills": {
        "keywords": { "React": 3, "TypeScript": 3 },
        "weight": 2.0
      },
      "secondary_skills": {
        "keywords": { "Node.js": 2, "PostgreSQL": 1 },
        "weight": 1.0
      },
      "nice_to_have": { "keywords": { "Kubernetes": 1 }, "weight": 0.5 }
    },
    "seniority": {
      "level": "senior",
      "signals": ["5+ years", "lead", "mentor"]
    },
    "domain": { "signals": ["fintech", "b2b-saas"], "weight": 0.5 },
    "negative": {
      "keywords": ["junior", "intern", "entry-level"],
      "weight": -10
    }
  }
  ```

  Human-readable, editable in the UI, mergeable across reference JDs (per-category keyword averaging). Mirrors the tiered structure in the existing `scoring.py`.

- **What a target defines**:
  - **Role label**: Derived from reference JD(s) or master document, user can override
  - **Scoring profile**: Categorized keywords with weights (see schema above). Stored as JSONB.
  - **Resume emphasis**: Tells the tailor which aspects of the experience document to prioritize for this target
  - **Job view**: Same raw jobs from polling, but filtered/ranked differently per target. A job can appear in multiple targets with different relevance scores.
  - **ATS sources** (optional): Some sources may only apply to one target
  - **Reference JDs**: The original JD(s) used to derive the profile, preserved for audit and re-derivation

- **Why this matters**:
  - Users can compare velocity across targets ("Frontend has 3x more openings than Product Manager this week")
  - Users can see which target converts better (more interviews per application)
  - Scoring weights diverge per target without polluting a single global config
  - Resume generation knows which experience emphasis to use without asking every time
  - Works for any career direction, not just roles we anticipated

- **Schema implications** (shared-targets architecture, feature/fitted):
  - `job_targets` table: `id`, `label`, `normalized_label`, `description`, `scoring_profile` (JSONB), `search_keywords`, `is_active`, `profile_version`, `activation_status`, `created_at`, `updated_at`. Targets are shared entities, no `user_id`.
  - `user_targets` junction: `id`, `user_id`, `target_id`, `resume_emphasis` (JSONB), `is_active`, `fit_score`, `fit_score_reasoning`, `created_at`, `updated_at`. Per-user link with LLM-derived fit score.
  - Postgres trigger keeps `job_targets.is_active` in sync with any active `user_targets` row (poller continues to query global active flag).
  - `target_reference_jds`: `id`, `target_id`, `jd_url`, `jd_text`, `extracted_profile` (JSONB), `created_at`
  - `job_postings.target_id` nullable FK (unassigned or assigned to a target)
  - `job_target_scores.scored_profile_version` for lazy re-scoring when `target.profile_version` bumps
  - Insights queries group by target

- **Zero state**: No targets exist until the user creates one. The onboarding flow guides target creation (see Onboarding section). No job scoring or discovery runs until at least one target exists.

- **v1**: Single target (matches immediate need). Multi-target is additive — the schema supports it from day one, the UI adds a target switcher when ready.

### 5. Application Tracking

- **Status progression**: Job status advances as user takes action (generate draft, approve resume, mark as applied, etc.)
- **Action history**: Every status change, resume generation, and user action is logged with timestamps
- **Interview tracking**: Single "interviewing" status. Users can add their own labels/notes per stage at a later time — all interviews vary.
- **Insights panel**:
  - **Application velocity**: Resumes generated per week, applications submitted per week
  - **Target comparison**: Jobs fetched, scores, and conversion rates per job target
  - **Skill frequency**: Which skills keep appearing in JDs the user likes
  - **Response rates**: Applied → interview → offer funnel
  - **Score distribution**: How the user's match scores trend over time

### 6. Authentication

- **Magic link via Supabase Auth**: User enters email → receives one-time login link → clicks → authenticated. No passwords, no signup form. Session managed by Supabase Auth (JWT + refresh token). Email/password can be added later if needed.
- **Admin dashboard**: Migrated to a separate concern — data insights on the tools themselves (polling health, LLM costs, system metrics). Not the user-facing job application UI.
- **Tenancy hedge**: `user_id UUID NULL` on all user-authored tables (per #185 plan). Nullable → non-nullable is one migration if this opens up.

### 7. Notifications (multi-channel)

- **Email**: Via Resend (already integrated in the app). New high-score job alerts.
- **SMS/Text**: Great-fit jobs get a text with a deep link to the job in Fitted. User clicks → logged in (magic link session) → sees the job → can generate resume immediately. Requires a provider (Twilio or similar — Resend doesn't do SMS).
- **Threshold**: Default score threshold for notifications. User can adjust or reset. Per-target thresholds in multi-target mode.
- **Same flow for both channels**: The notification links to the specific job. The user can act on it immediately from the notification.

### 8. LLM Cost Visibility

- Per-resume generation cost (tokens, model, dollars)
- Aggregate cost dashboard (helps inform pricing if opened to others)
- Cost log table already exists in Supabase (`llm_cost_log`)

### 9. Master Document Health

The master document is the foundation of everything — no targets, no resumes, no tailoring without it. The app surfaces its health prominently.

- **Gap tracking**: LLM identifies unfilled slots in the optimized doc (roles without quantified outcomes, skills without examples, timeline jumps). The gap tracker already exists in `services/experience/gap_tracker.py`.
- **Gap percentage**: A single number representing master document completeness.
- **Visual status indicator**: The LLM/experience button in the UI always shows the current gap status:
  - 50%+ gaps → red
  - 35%+ gaps → orange
  - 25%+ gaps → yellow
  - 15%+ gaps → lime/yellow
  - 5%+ gaps → green
- **Resume generation gate**: The app cannot generate tailored resumes if master document gaps exceed 45%. The user must fill gaps first.
- **Multiple resume uploads**: Users can upload many resumes to feed/merge into the master document. Each upload is parsed and merged, not replaced.
- **Manual editing**: Users can copy/paste the master document directly at any time.
- **LLM assist**: Users can click the LLM button at any time to get probing questions that fill gaps.

## Onboarding

After clicking the magic link, the user lands on the onboarding page. A skip button is always available.

### Option A: "I have a resume and a role in mind"

```
→ Experience tab opens
  → Resume upload tab activates automatically
  → User uploads resume file
  → App parses resume → prepopulates master document
→ Back to main experience tab (master document visible)
→ User navigates to Job Targets tab
  → Zero state: cloud of suggested targets (derived from master document) + target search + job URL input
  → User pastes a job URL
  → App extracts metadata → creates new target
  → Job URL appears as first item with "manual entry" badge
  → Quick view loads for the job
  → User clicks into job panel
    → App gathers deeper insights (LLM analysis)
    → App grades master document against job requirements
    → "Tailor Resume" button appears
    → User clicks → draft resume generated
    → User edits or approves draft
    → Resume attributed to job, downloadable as .docx
  → User clicks job URL → new browser tab opens for application
```

### Option B: "I have a resume but I'm looking for a role"

```
→ Experience tab → resume upload → master document prepopulated (same as A)
→ Job Targets tab
  → Cloud of suggested targets (derived from master document)
  → User picks an adjacent role from suggestions
  → New target created with derived scoring profile
  → App loads jobs list for target (from ATS polling)
  → User browses, clicks in, generates resumes (same as A)
```

### Option C: "I'm lost, I need help"

```
→ Experience tab
  → No resume to upload
  → "Start master document" conversation begins
  → LLM asks probing questions: skills, education, job experience, accomplishments
  → App builds master document from conversation
→ Back to main experience tab (master document visible)
→ Continues to targets (same as B — suggested target cloud from master doc)
```

## App Constraints

These are hard rules the system enforces:

- App starts in zero state. No content, no targets, no jobs.
- User must create a master document before anything else works.
- App cannot generate targets without a master document.
- App cannot generate tailored resumes without a master document.
- App cannot generate tailored resumes without target → job attribution.
- App cannot generate tailored resumes if master document gaps exceed 45%.
- User can upload many resumes to feed/merge into the master document.
- User can click the LLM assist button at any time to fill gaps.
- User can copy/paste the master document directly.

## UI Requirements

- Mobile-friendly
- Dark mode (theme system already exists in the app)
- Fast (loading skeletons, optimistic updates)
- Clean enough to screen-share in an interview or demo
- Not mediocre

## Architecture

### Backend: `apps/job-api/` (FastAPI on Railway)

- All job discovery, scoring, LLM analysis, resume generation, and document rendering
- Supabase for persistence
- Anthropic SDK for LLM (prompt caching on static career data)

### Frontend: `apps/root/` (Next.js on Vercel)

- User-facing app at `/fitted` (migrate from `/tools/admin/jobs/`)
- Admin/tools insights remain at `/tools/admin/`
- Proxy API routes for FastAPI communication

### Key service boundaries

| Service                  | Responsibility                                                            |
| ------------------------ | ------------------------------------------------------------------------- |
| `services/scoring/`      | Keyword scoring (v1) + LLM analysis (v2)                                  |
| `services/experience/`   | Prose + optimized docs, chunks, embeddings, preferences, gap tracking     |
| `services/conversation/` | Chat orchestration (onboarding, updates), turn persistence                |
| `services/targets/`      | Target CRUD, reference JD extraction, scoring profile derivation/merge    |
| `services/ingest/`       | Resume file parsing (PDF/.docx → text), job URL extraction cascade        |
| `services/validate/`     | URL validation, redirect detection, banned sites, content verification    |
| `services/tailor/`       | JD + optimized doc + target emphasis → structured resume JSON             |
| `services/docx/`         | Structured JSON → .docx bytes (resume + cover letter via `document_type`) |
| `services/ats_lint/`     | Deterministic format validation post-render                               |
| `services/notify/`       | Email (Resend) + SMS (Twilio) notifications, threshold management         |
| `services/llm/`          | Anthropic client, prompt caching, retries, cost logging                   |

## What Exists Today

- [x] ATS integrations (5 providers + auto-detect)
- [x] Keyword scoring v1
- [x] Poller with stale detection
- [x] Job CRUD + status management
- [x] Admin dashboard (migrated to user-facing at `/fitted`)
- [x] Supabase schema (jobs, sources, status log, experience, cost log)
- [x] Experience services (prose, optimized, chunks, conversation, gap tracker)
- [x] LLM + embeddings client scaffolding
- [x] JWT admin auth
- [x] LLM wired into the API (Anthropic client with prompt caching + cost logging)
- [x] LLM job analysis / scorecard + recommendation (on-demand via Analyze button)
- [x] Job targets (reference JD extraction, master doc derivation, scoring profile merge)
- [x] Target-suggested cloud (derived from master document, "Suggest" button on targets page)
- [x] Resume tailoring pipeline (JD + optimized doc + target emphasis → structured JSON)
- [x] Resume reuse within targets (Jaccard similarity at 70%, clone via source_resume_id)
- [x] .docx rendering (individual download + bulk zip export)
- [x] ATS format linter (deterministic post-render validation)
- [x] Batch generation flow (max 20 via Pydantic, warning >5, disabled >20)
- [x] Draft → free-text edit → approve → export flow (ResumeEditor with approve/download)
- [x] Manual JD entry (paste URL, cascade: HTTP → Firecrawl → warn)
- [x] Job URL validation (format, redirects, banned sites, content verification)
- [x] User-facing auth (Supabase Auth, magic link)
- [x] Onboarding flow (three paths: resume+role, resume only, from scratch)
- [x] Resume upload → master document parsing/merge (auto-derive on upload)
- [x] Master document gap tracking + visual health indicator (dashboard health card)
- [x] 45% gap gate on resume generation
- [x] Expanded status lifecycle (new, saved, resume_draft, resume_ready, applied, interviewing, offer, rejected, archived)
- [x] Insights panel (velocity, target comparison, skill frequency, funnel)
- [x] Email notifications (Resend, threshold-based, settings UI)
- [x] SMS notifications (Twilio, deep link, phone/threshold/daily limit settings)
- [x] Experience annotations (CRUD API + profile page management UI)
- [x] Action history / status timeline per job
- [x] Per-resume LLM cost metadata (cost, tokens, model, latency in ResumeEditor)
- [x] Prose editor (view/edit/save/save+derive on dashboard)
- [x] Derived document viewer (experience + skills on dashboard)
- [x] Settings page (notification preferences at /fitted/settings)
- [x] v2 LLM-powered scoring (keyword pre-filter >= 40, LLM analysis, 60/40 blend)
- [x] Firecrawl fallback (#407, three-tier cascade: HTTP → HTML parsing → Firecrawl)
- [x] Three-stage scoring pipeline (keyword + section-aware JD parser + LLM, target-relative)
- [x] Cover letter generation (UI + .docx export, shared renderer with document_type param)
- [x] Shared targets architecture (Phase 1–6: schema + user_targets junction + matching + fit scores + profile versioning + UI)
- [x] LLM-derived fit scores per user_target link (with reasoning, surfaced as badge in TargetsList)
- [x] Profile versioning with lazy re-scoring (poller re-scores stale rows when target.profile_version bumps)
- [x] Session-derived user_id (`get_current_user_id` extracts JWT sub, ready for multi-user)
- [ ] Multi-target UI cross-target insights (per-target velocity / score-distribution comparison)
- [ ] Per-target resume templates (future, one default template for v1)

## Migration Path

The current `/tools/admin/jobs/` dashboard becomes a data source for the admin. The user-facing Fitted app lives at `/fitted` with its own auth, layout, and UX designed around the workflow above. Shared backend — same FastAPI service, same Supabase tables.

## Resolved Questions

1. **Auth**: Supabase Auth with magic link. No passwords for v1.
2. **Route structure**: `/fitted`, `/fitted/jobs/[id]`, `/fitted/profile`, `/fitted/insights`
3. **Interview tracking**: Single "interviewing" status. Granular labels are a future enhancement.
4. **Insights MVP**: Application velocity first, then target comparison metrics.
5. **Job targets**: Not presets. Two creation paths: reference JD or master document analysis. Zero state until first target.
6. **Scoring profile schema**: Option B — categorized keywords with weights, tiered (core/secondary/nice-to-have). Mergeable across reference JDs.
7. **Manual JD extraction**: HTTP fetch + HTML parsing → Firecrawl fallback (short timeout) → user warning. Validate URLs for redirects, scams, banned sites.
8. **Notifications**: Multi-channel (email via Resend + SMS via Twilio). Threshold-based with user-configurable default. Deep link to specific job.
9. **Batch limits**: Default 5, warning above 5. Larger batches processed in background groups.
10. **Draft editing**: Free-text editing on the whole resume.
11. **Experience annotations**: Inline comments in master prose doc control per-target emphasis/exclusion.
12. **Resume template**: One default template for all targets in v1. Per-target templates in schema from day one.
13. **Resume reuse**: Within a target, existing resumes can be referenced for similar jobs. Falls back to master doc if variance is too high.
14. **Onboarding**: Three paths (A: resume+role, B: resume only, C: from scratch). Skip button always available.
15. **Master document**: Single source of truth. Multiple resume uploads merge into it. 45% gap threshold gates resume generation.

## Manual Verification Checklist (PR #545 — shared targets)

Automated checks are green (mypy, 626 unit tests, lint, frontend tsc, dashboard/jobs/targets browser walk all pass with zero console errors). The data plumbing for shared targets + fit scores is verified end-to-end. The remaining pieces require an authenticated browser and live LLM calls — walk these next time you're using the tool:

**Golden path** (one role end-to-end):

- [ ] `/fitted/targets` → click **Suggest** → confirm LLM-derived adjacent roles render with `existing` vs `new` badges, and roles you already have are excluded
- [ ] Pick one suggested role → confirm it links via `POST /targets/{id}/link` and a fit score + reasoning is persisted on the `user_targets` row
- [ ] `/fitted/targets` cards now show the fit-score badge for that target (existing pre–Phase 4 targets won't have one until they're re-linked or the score is back-filled)
- [ ] Activate the target → confirm `job_targets.is_active` flips via the Postgres trigger and the poller picks it up on next cycle
- [ ] `/fitted/jobs?target={id}` → pick a high-scoring posting → click **Tailor Resume** → confirm draft generates against the _target's_ scoring profile + _user's_ resume_emphasis (not a global blob)
- [ ] Approve the draft → export `.docx` → spot-check that the emphasis fields applied
- [ ] (Phase 5 sanity) edit the target's scoring profile → confirm `profile_version` bumps → next poll re-scores stale jobs lazily (`scored_profile_version < target.profile_version`)

**Edge cases worth poking at:**

- [ ] Suggest while signed in to a brand-new test account (no existing links) — confirm fit scores derive cleanly the first time
- [ ] Two targets with similar scoring profiles → confirm `match.py` exact/trigram matching prefers the existing target instead of creating a duplicate
- [ ] Deactivate the only active `user_targets` row for a target → trigger should flip `job_targets.is_active = false` and poller should stop fetching for it

If any of these fail, the failure mode is most likely in `services/targets/match.py`, `services/targets/fit_score.py`, or the `sync_target_active` trigger — those are the newest surfaces.

## Open Questions

1. **Resume template design**: Daniel will provide a reference layout.
2. **SMS provider**: Twilio confirmed? Or evaluate alternatives?
3. **Resume parsing**: What library/service parses uploaded resume files (PDF, .docx) into structured text for master document ingestion?
4. **Gap percentage calculation**: How does the gap tracker compute the percentage? Weighted by section importance? Or uniform across all slots?
5. **Target cloud derivation**: What model/prompt generates "adjacent role" suggestions from the master document? How many suggestions?
6. **Banned sites list**: Seed with known scam/aggregator domains. Community-maintained? Or just a static list we curate?
