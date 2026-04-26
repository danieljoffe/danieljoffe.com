# Fitted — Scope Gap Analysis

What remains to close every item in the "What Exists Today" checklist.

## 1. v2 LLM-powered scoring

**Status**: Infrastructure ready, pipeline integration needs design decisions.

**What exists**:

- On-demand LLM analysis (`POST /analysis/{job_id}`) with full scorecard (skills matched/missing, seniority fit, domain fit, recommendation)
- Anthropic client with prompt caching + cost logging
- Frontend "Analyze" button in JobDetailPanel

**What's needed**:

- Add `llm_score` (nullable float) column to `job_postings`
- Add threshold gate in `poller.py` (after keyword scoring, only LLM-analyze jobs scoring above e.g. 40)
- `scorecard_to_numeric()` helper to convert Scorecard → 0-100
- Blended score: `0.6 * keyword + 0.4 * llm` (or configurable weights)
- Store both scores; use blended for ranking

**Cost estimate**: ~$0.03-0.05/job uncached, ~$0.003/job cached (system prompt caching already enabled). At 100 jobs/day with a 40+ threshold gate filtering to ~30 candidates: ~$9/month.

**Decisions needed**:

- Score threshold for LLM gate (40? 50?)
- Blend weights (60/40? configurable per target?)
- Run during polling (batch, adds latency to poll cycle) or async post-poll?

**Complexity**: Moderate — 1 migration, ~100 lines of scoring logic, poller wiring.

---

## 2. Firecrawl fallback

**Status**: Fully built. Just needs an API key.

**What exists**:

- `services/firecrawl.py` — full Firecrawl REST API integration (v2/scrape, 120s timeout, structured extraction)
- `services/extract.py` — three-tier cascade: HTTP fetch → JSON-LD/HTML parsing → Firecrawl fallback (15s timeout)
- `routers/jobs.py` `add_manual_job()` — wires the full cascade for manual entry
- `config.py` — `firecrawl_api_key` field reads from `FIRECRAWL_API_KEY` env var
- Gate: Firecrawl tier activates only when API key is set, otherwise logs "skipping"

**What's needed**:

- Set `FIRECRAWL_API_KEY` in production environment
- Test with a few custom career pages (non-API sites)

**Decisions needed**: None — code is complete.

**Complexity**: Trivial — environment variable only.

---

## 3. Cover letter generation

**Status**: Backend 100% complete. Needs frontend UI.

**What exists**:

- `run_cover_letter_pipeline()` in `services/tailor/pipeline.py`
- `POST /tailor/cover-letter` + `GET /tailor/cover-letters` router endpoints
- `render_cover_letter_docx()` in `services/docx/renderer.py`
- `DocumentType = Literal["resume", "cover_letter"]` schema
- `CoverLetterRequest` model with job_description, company_name, contact, role_title, preferences

**What's needed**:

- "Generate Cover Letter" button in JobDetailPanel (alongside existing resume controls)
- Cover letter viewer/editor component (similar to ResumeEditor but for cover letter structure)
- Cover letter download (.docx) wired to existing renderer
- Proxy route for cover letter endpoints

**Decisions needed**: None — backend API is defined.

**Complexity**: Moderate — ~200-300 lines of frontend, follows existing ResumeEditor pattern.

---

## 4. Multi-target UI

**Status**: Core switching works. Needs cross-target insights.

**What exists**:

- `job_postings.target_id` FK (nullable)
- Target tab switcher in JobsList with URL param filtering (`?target=...`)
- `GET /jobs?target_id=...` backend filtering
- Target CRUD, scoring profiles, reference JDs — all built

**What's needed**:

- Cross-target comparison in Insights page (side-by-side velocity, score distributions, conversion rates per target)
- Per-target score filter defaults (use target's scoring profile to suggest a min-score)

**Decisions needed**: What metrics matter most for target comparison?

**Complexity**: Moderate — mostly Insights page additions.

---

## 5. Per-target resume templates

**Status**: Not started. Schema supports it conceptually but no code exists.

**What exists**:

- `resume_type` field on `TailoredResumeRecord` (string, e.g. "senior-frontend")
- `resume_emphasis` JSONB on `job_targets` (prepared but unused for template selection)
- Single default .docx template in renderer

**What's needed**:

- `resume_templates` table (id, name, layout_config JSONB, created_at)
- `template_id` FK on `job_targets` (nullable)
- Renderer refactored to accept template config (section ordering, emphasis styles)
- Template selector UI on target edit page
- Template CRUD (backend + frontend)

**Decisions needed**: What varies between templates? Section order? Visual style? Content emphasis rules?

**Complexity**: Significant — new table, renderer refactor, full CRUD UI.

---

## Priority Recommendation

| Item                  | Effort                        | Impact                              | Recommendation       |
| --------------------- | ----------------------------- | ----------------------------------- | -------------------- |
| Firecrawl fallback    | Trivial (env var)             | Enables custom career page support  | Set API key now      |
| Cover letters         | Moderate (frontend only)      | Completes document generation suite | Build next           |
| v2 LLM scoring        | Moderate (migration + wiring) | Better job ranking                  | After cover letters  |
| Multi-target insights | Moderate (insights UI)        | Better target comparison            | Incremental          |
| Per-target templates  | Significant (full feature)    | Polish, not blocking                | Defer to next sprint |
