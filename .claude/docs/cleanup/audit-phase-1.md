# Audit Phase 1 — Experience

Covers Phase 1 of [#493](https://github.com/danieljoffe/danieljoffe.com/issues/493): resume upload, gap health, annotations.

**Sub-issues:** [#497](https://github.com/danieljoffe/danieljoffe.com/issues/497) · [#498](https://github.com/danieljoffe/danieljoffe.com/issues/498) · [#499](https://github.com/danieljoffe/danieljoffe.com/issues/499)

## Phase summary

| Sub-issue          | Status      | Headline finding                                                                                                                                                                                                                                 |
| ------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| #497 Resume upload | ✅ shipped  | All ACs met. PDF + DOCX parse, merge, original preserved, `auto_derive` wired front-to-back. Dedup at the LLM-extraction layer (F1-B fixed).                                                                                                     |
| #498 Gap health    | ✅ resolved | 3-tier gap colors documented as intentional simplification of the 5-tier spec. The misleading 45% generation gate was removed by design — replaced with a non-blocking critical-gap warning that opens the LLM-assist chat (F1-C / F1-D / F1-E). |
| #499 Annotations   | ✅ resolved | LLM now extracts inline-comment annotations from the prose doc during derivation. The structured ProfilePage form + dead HTTP routes were dropped — annotations live in the master doc, the LLM interprets them (F1-F / F1-G).                   |

**Rejected agent claims** (verified false): F1-A (`auto_derive` is fully wired), F1-H (`apply_exclusions` is called by tailor pipeline). See [Rejected findings](#rejected-findings) at bottom.

**Open triage decisions** (for the user): see [Triage queue](#triage-queue) at the bottom.

---

## #497 — Resume upload

### Status: ✅ shipped

### Code map

**Service (`services/ingest/`, 200 LOC total)**

- `parse.py:37-63` — `parse_pdf()` via pdfplumber, returns `ParsedResume`
- `parse.py:66-85` — `parse_docx()` via python-docx
- `parse.py:88-118` — `parse_resume()` router (content-type, ext fallback, 10 MB limit, `ParseError`)
- `merge.py:12-29` — `merge_into_prose()` — pure concat with `[Uploaded Resume: {filename}]` divider
- `storage.py:18-34` — `upload_file()` to Supabase Storage `resume-uploads` bucket

**Router**

- `app/routers/experience.py:91-209` — `POST /experience/upload-resume`
  - 10 MB cap (`max_upload_bytes`)
  - `parse_resume` runs in `asyncio.to_thread` (blocking I/O)
  - Storage upload non-fatal (warning on failure, line 140-142)
  - `resume_uploads` row inserted (line 165)
  - Optional `auto_derive=true`: runs derivation, carries forward valid annotations (lines 181-188), creates optimized doc, embeds chunks

**Frontend**

- `apps/root/src/app/fitted/onboarding/ResumeUploader.tsx:61` — onboarding upload with `auto_derive=true`
- `apps/root/src/app/fitted/(app)/DashboardPage.tsx:132,275` — dashboard "Upload Resume" with `auto_derive=true`

**Tests**

- `apps/job-api/tests/test_ingest.py` (199 lines) — parse + merge unit tests
- `apps/job-api/tests/test_upload_resume.py` (309 lines) — endpoint integration tests including `test_auto_derive_triggers_pipeline`

### Acceptance criteria

| AC                                            | Status | Evidence                                                                          |
| --------------------------------------------- | ------ | --------------------------------------------------------------------------------- |
| PDF resume parsed to structured text          | ✅     | `parse.py:37-63` — pdfplumber per-page extraction, empty-page warnings.           |
| .docx resume parsed to structured text        | ✅     | `parse.py:66-85` — python-docx paragraph extraction.                              |
| Extracted content merged into master document | ✅     | `merge.py:12-29` + `experience.py:144-150`.                                       |
| Multiple uploads merge additively             | ✅     | `merge_into_prose` appends to existing content with section divider.              |
| Original files preserved                      | ✅     | `storage.py` + `experience.py:131-142` — Supabase Storage with non-fatal failure. |
| API endpoint `POST /experience/upload-resume` | ✅     | `experience.py:91`.                                                               |

### Findings

**F1-B: dedup not implemented (spec divergence, not AC failure)**
The issue's _Requirements_ section says "Handle duplicate detection (don't re-add content that already exists)", but the AC checklist does not. `merge_into_prose` is a naive concat. If the user re-uploads the same resume, the prose doc will contain two copies. Master documents can grow to thousands of lines with repeated upload content; LLM dedup at extraction time is cheaper and more nuanced than rule-based string matching at merge time.

### Fixes applied

**F1-B (commit `ee1bc592`)** — Dedup pushed to the LLM extraction layer in `derive.py`. The SYSTEM_PROMPT now instructs the model to:

- Produce one Role per `(company, title, start)` tuple, merging skills + outcome refs across duplicates.
- Produce one Skill per canonical name, taking the maximum `years` value across mentions.
- Drop outcomes whose description is a paraphrase of another.

Granularity is delegated to the LLM — it understands phrasing variations the rule-based concat can't. The prose doc still carries every upload verbatim (intentional, for audit + manual editing); only the derived doc is deduped.

---

## #498 — Master document gap health

### Status: ✅ resolved

### Code map

**Service**

- `app/services/experience/gap_tracker.py` (208 lines)
  - `_pct_to_tier()` lines 28-33 — **3 tiers**: red ≥45%, yellow ≥25%, green
  - `detect_gaps()` lines 46-130 — pure scan over `OptimizedPayload`, six gap kinds, weighted priorities
  - `top_gap()` line 133 — most urgent gap
  - `can_generate()` lines 138-168 — **structural minimums only** (no_roles, insufficient_outcomes). Does **not** check `gap_pct`.
  - `gap_health()` lines 171-208 — weighted gap_pct + tier + gap list

**Router**

- `experience.py:301-308` — `GET /experience/gap-health`
- `tailor.py:84-97, 195-206` — calls `can_generate()` to gate resume generation

**Frontend**

- `apps/root/src/app/fitted/(app)/DashboardPage.tsx:328-351`
  - Badge "% complete" (line 333-334)
  - ProgressBar (line 339-344)
  - **Alert at line 346-351**: "Resume generation is blocked until gaps are below 45%." — but the backend doesn't enforce this; tailor will succeed if `can_generate()` (structural) passes.
- `apps/root/src/app/fitted/(app)/profile/ProfilePage.tsx:64-87, 304` — fetches gap-health, renders gap list
- `tierToBadgeVariant`, `tierToProgressVariant` (component helpers) handle 3 tiers only

**Tests**

- `apps/job-api/tests/test_gap_tracker.py` (300 lines) — solid coverage of `detect_gaps`, `gap_health`, `can_generate` (structural), `top_gap`.

### Acceptance criteria

| AC                                                                 | Status | Evidence                                                                                                                                                  |
| ------------------------------------------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gap percentage computed from optimized doc analysis                | ✅     | `gap_tracker.gap_health()` lines 171-208.                                                                                                                 |
| Visual indicator with **5-tier** color coding                      | ❌     | `_pct_to_tier()` lines 28-33 — only 3 tiers (red/yellow/green). `GapTier = Literal["red", "yellow", "green"]` in `models/conversation.py:93`.             |
| **45% threshold gates resume generation** with clear error message | 🟡     | `can_generate()` ignores `gap_pct`. UI shows a 45% Alert (DashboardPage:346) but the threshold is not actually enforced server-side.                      |
| LLM assist button triggers gap-filling conversation                | 🟡     | Backend exists (`/conversation/next-probe`, lines 443-449). Frontend `ConversationChat` only used in `OnboardingWizard.tsx:123` — no profile-page button. |
| Gap percentage updates after each master doc change                | ✅     | `gap-health` is fetched on profile/dashboard load; pure function over latest optimized doc.                                                               |

### Findings

**F1-C: gap tiers are 3-color, not 5-color (AC #2 ❌)**
`gap_tracker.py:28-33` returns red ≥45%, yellow ≥25%, green. The spec calls for: 50%+ red, 35%+ orange, 25%+ yellow, 15%+ lime, 5%+ green. Current code lacks orange and lime entirely. The `GapTier` literal type at `models/conversation.py:93` would need to expand to `red | orange | yellow | lime | green`, plus frontend `tierToBadgeVariant` / `tierToProgressVariant` helpers.

**F1-D: 45% generation gate is not actually enforced (AC #3 🟡)**
`can_generate()` at `gap_tracker.py:138-168` only blocks on `no_roles` and `insufficient_outcomes` (>50% of roles missing outcomes). It never reads `gap_pct`. The frontend Alert at `DashboardPage.tsx:346-351` tells the user "Resume generation is blocked until gaps are below 45%" — **this is a lie**. If the user has 1 role with 1 outcome and 50% gap_pct, the tailor will run.

The fix is small: add a `gap_pct >= 45` branch to `can_generate()` returning a `GateResult` with `reason="gap_threshold"`. Tailor router already handles `GateResult` and surfaces `gap_pct` in its 422 error (lines 86-97).

**F1-E: no LLM-assist button on profile page (AC #4 🟡)**
`ConversationChat.tsx` (the only UI that calls `/conversation/turn` and `/conversation/next-probe`) is only mounted inside `OnboardingWizard`. After onboarding, the user can see their gaps on `/fitted/profile` but has no button to trigger a gap-filling conversation. Backend is fully wired — the gap is purely UI.

### Fixes applied

**F1-C (decision, no code change)** — The 3-tier gap palette (red ≥45% / yellow ≥25% / green) is intentional, kept in place over the spec's 5-tier (red / orange / yellow / lime / green). The 3-tier model was a previous Claude recommendation to give users actionable categories without false-precision noise from intermediate bands. Issue [#498](https://github.com/danieljoffe/danieljoffe.com/issues/498) AC #2 is reframed: "visual indicator with color coding" — granularity is a product call, not a spec mandate.

**F1-D (commit `13605410`)** — The 45% generation gate is removed by design. Resume generation now proceeds regardless of `gap_pct`; per-user annotations in the master doc let users opt out of surfacing thin sections. The misleading "Resume generation is blocked until gaps are below 45%" Alert in `DashboardPage.tsx` is replaced with a non-blocking warning — visible only when `gapHealth.tier === 'red'` — that explains the tradeoff and offers a "Answer questions to fill gaps" button. Issue [#498](https://github.com/danieljoffe/danieljoffe.com/issues/498) AC #3 is reframed: a non-blocking warning, not a hard gate.

**F1-E (commit `13605410`)** — `ConversationChat` moves from `apps/root/src/app/fitted/onboarding/` to a shared `apps/root/src/app/fitted/_components/` directory and is wrapped in a tiny `ConversationChatModal` that handles dialog chrome + refresh-on-complete. Three entry points open the same modal:

- Dashboard "Improve with AI" button (was a link to `/fitted/onboarding`)
- Dashboard critical-gaps Alert button (new — opens chat from F1-D warning)
- Profile "Improve with AI" button (new — header trigger)

The `OnboardingWizard` import is updated to the shared path; the wizard flow is unchanged.

---

## #499 — Experience annotations

### Status: ✅ resolved

### Code map

**Service**

- `app/services/experience/annotations.py` (228 lines)
  - `add_annotation()` lines 28-55 — DB-backed, creates new optimized version with `source="user_edit"`
  - `remove_annotation()` lines 58-79
  - `list_annotations()` lines 82-90
  - `resolve_for_target()` lines 98-130 — pure: partition into emphasize/exclude/de-emphasize for a given target_label (case-insensitive)
  - `apply_exclusions()` lines 133-178 — pure: drop excluded roles/skills/outcomes from payload
  - `build_annotations_text()` lines 181-203 — pure: format emphasize/de-emphasize as prompt directive lines
  - `validate_annotation_refs()` lines 206-228 — pure: drop annotations whose ref no longer exists (re-derivation safety)

**Derivation pipeline**

- `app/services/experience/derive.py` — SYSTEM_PROMPT (lines 20-59) extracts roles/skills/outcomes/summary. **No "annotation" references.** AC #1 ("parsed from prose doc during derivation") is not implemented at this layer.
- `experience.py:181-188, 273-280` — `auto_derive` and `/derive` endpoints carry forward valid annotations from the previous optimized doc via `validate_annotation_refs()`. AC #5 ("annotations survive re-derivation") is satisfied here, not in derive.py itself.

**Conversation pipeline**

- `app/services/conversation/orchestrator.py:162-174` — when the LLM parses an annotation directive from a user turn (`parsed.annotation`), `annotation_svc.add_annotation()` is called. AC #4 conversational input ✅.

**Tailor pipeline**

- `app/services/tailor/pipeline.py:33` — imports `apply_exclusions`
- `app/services/tailor/pipeline.py:94, 217` — calls `apply_exclusions` and `build_annotations_text` for resume + cover letter
- AC #3 ("Tailor respects emphasis/exclusion annotations per target") ✅

**Router**

- `experience.py:314-342` — `GET/POST/DELETE /experience/annotations`

**Frontend**

- `apps/root/src/app/fitted/(app)/profile/ProfilePage.tsx:65, 109-134, 297, 350-411, 566-571` — list, add, delete annotations via form. AC #4 direct-editing path ✅ (but the spec says "via direct text editing — copy/paste the master doc" with inline comments; the actual UX is a structured form with action/ref_type/ref_value selectors).

**Tests**

- `apps/job-api/tests/test_annotations.py` (264 lines) — covers all CRUD + pure functions

### Acceptance criteria

| AC                                                          | Status | Evidence                                                                                                                                                                       |
| ----------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Inline annotations parsed from prose doc during derivation  | ❌     | `derive.py` SYSTEM_PROMPT has zero "annotation" references. Conversation parses them at orchestrator:162-174; prose doc is never scanned.                                      |
| Annotations stored as structured metadata on optimized doc  | ✅     | `add_annotation()` writes to `payload.annotations`, persisted via `optimized.create_version()`.                                                                                |
| Tailor respects emphasis/exclusion annotations per target   | ✅     | `tailor/pipeline.py:33,94,217` — `apply_exclusions` + `build_annotations_text` integrated.                                                                                     |
| User can add annotations via direct editing OR conversation | 🟡     | Conversation: ✅ (orchestrator:162-174). "Direct editing" implemented as a structured form (action/ref_type/ref_value), not the inline-comment-in-prose UX the spec describes. |
| Annotations survive re-derivation                           | ✅     | `validate_annotation_refs()` called by `/derive` (line 273-280) and `/upload-resume?auto_derive=true` (lines 181-188).                                                         |

### Findings

**F1-F: prose-doc inline annotation parsing not implemented (AC #1 ❌)**
The spec example: _"Don't include my helpdesk role on engineering resumes"_ pasted into the master prose doc should be picked up by the LLM during derivation and stored as an annotation. Today, `derive.py` prompt only extracts roles/skills/outcomes/summary — the schema doesn't even include an `annotations` field. Annotations only ever come from the `POST /annotations` endpoint or from a conversation turn.

The fix is medium: extend `derive.py` SYSTEM_PROMPT to include an `annotations` array in the JSON schema with example detection rules ("look for emphasis/exclusion directives in the prose"); update `OptimizedPayload` to accept the LLM-derived annotations; merge them with carried-forward annotations in the auto-derive code path.

**F1-G: "direct editing" UX is a form, not inline prose comments**
The spec says users "add inline comments in the master prose document" (copy/paste). The actual UX is a structured form on `ProfilePage.tsx` with explicit action / ref_type / ref_value selectors. This is **better engineering** (typed, no NLP needed) but **diverges from the spec description**. If F1-F is built, the prose-comment path becomes naturally available — the user types "Don't include my helpdesk role" inline, the next derivation extracts it.

### Fixes applied

**F1-F (commit `ee1bc592`)** — `derive.py` SYSTEM_PROMPT extended to scan the prose for inline HTML comments (`<!-- ... -->`) and emit each as an `annotations[]` entry on `OptimizedPayload`. Examples covered in the prompt:

- `<!-- exclude my helpdesk role from frontend resumes -->`
- `<!-- emphasize React work for frontend targets -->`
- `<!-- de-emphasize pre-2017 bullets -->`

`Annotation.id` defaults to `Field(default_factory=lambda: str(uuid.uuid4()))` so the LLM can omit it during extraction — the server fills it in. A new `merge_annotations()` helper dedupes by `(action, ref_type, ref_value, target_label)` identity tuple and is called in both the `/derive` and `/upload-resume?auto_derive=true` paths, with carried-forward annotations winning on collision (preserves stable ids for downstream consumers).

**F1-G (commit `150fbf8c`)** — The structured `AnnotationsSection` + `AddAnnotationForm` on `ProfilePage` and the `GET/POST/DELETE /experience/annotations` HTTP routes are removed (~470 lines). Annotations now live in the master document as inline HTML comments — the LLM interprets them. Conversation-driven annotation creation in `orchestrator.py` is unchanged.

**TODO (markdown editor for master document)** — The master document is currently edited as a plain `<textarea>` in `DashboardPage.tsx`. HTML comments work today (the LLM parses them) but the editor offers no syntax help. Future work: add a markdown editor with HTML-comment hints, possibly with a "more information" modal explaining the annotation grammar (per-target / per-skill / global emphasis, exclusion, de-emphasis).

---

## Rejected findings

These were initially flagged by code-map exploration but rejected on direct verification.

**~~F1-A: `auto_derive` is a stub~~** — REJECTED. Verified at:

- `app/routers/experience.py:94` — `auto_derive: bool = Query(default=False)`
- `app/routers/experience.py:169` — `if auto_derive: ...` triggers `derive.derive_from_prose`
- Frontend uses it: `ResumeUploader.tsx:61`, `DashboardPage.tsx:132`
- Test coverage: `test_upload_resume.py::test_auto_derive_triggers_pipeline`

**~~F1-H: `apply_exclusions` is not integrated into the tailor pipeline~~** — REJECTED. Verified at:

- `app/services/tailor/pipeline.py:33` — `from app.services.experience.annotations import apply_exclusions, build_annotations_text, resolve_for_target`
- `app/services/tailor/pipeline.py:94` — call site (resume path)
- `app/services/tailor/pipeline.py:217` — call site (cover letter path)

---

## Triage queue

All findings triaged and either fixed or documented as intentional. Kept for audit trail.

| ID   | Finding                                                                | Outcome                                                                                                       |
| ---- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| F1-B | #497 dedup not implemented (requirement, not AC)                       | ✅ fixed (`ee1bc592`) — LLM-extraction-layer dedup in `derive.py`                                             |
| F1-C | #498 gap tiers 3-color vs 5-color spec (AC #2 ❌)                      | ✅ documented — 3-tier intentional simplification, AC #2 reframed                                             |
| F1-D | #498 45% gate not enforced server-side; UI Alert is misleading (AC #3) | ✅ fixed (`13605410`) — gate removed by design, replaced with non-blocking critical-gap warning               |
| F1-E | #498 no LLM-assist button on profile page (AC #4)                      | ✅ fixed (`13605410`) — `ConversationChat` moved to shared, modal trigger on Dashboard + Profile              |
| F1-F | #499 prose-doc inline annotation parsing not implemented (AC #1 ❌)    | ✅ fixed (`ee1bc592`) — LLM extracts inline HTML-comment annotations during derivation                        |
| F1-G | #499 direct-editing UX is a form, not prose comments                   | ✅ fixed (`150fbf8c`) — structured form + dead HTTP routes removed; inline comments are now the only entry UX |

### Follow-ups (not in this phase)

- **Markdown editor for the master document** — TODO captured in #499 fixes-applied. Plain `<textarea>` works today; a markdown editor with HTML-comment hints would make the annotation grammar discoverable.
- **Issue #498 update** — Reframe ACs #2 and #3 to match the shipped behavior (3-tier color, non-blocking warning instead of hard gate).
