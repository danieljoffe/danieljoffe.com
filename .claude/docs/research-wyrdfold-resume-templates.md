# Wyrdfold Resume Templates — Research

_Date: 2026-05-31. Parallel investigation; scoped to templates (not markdown editor, not docx styling)._

## 1. Current generation flow

A click on **Generate Resume** in `apps/wyrdfold/src/app/(app)/jobs/ResumeSection.tsx` (`handleGenerate`, lines ~60–120; both compact and full variants render a `name='generate-resume'` button) fetches `description_html` from the job detail and POSTs `{ job_description, job_posting_id }` to the Next proxy route `apps/wyrdfold/src/app/api/jobs/tailor/resume/route.ts`, which forwards to the FastAPI endpoint `POST /tailor/resume` in `apps/wyrdfold-api/app/routers/tailor.py` (`create_tailored_resume`). That router resolves the latest `OptimizedPayload`, checks `gap_tracker`, optionally short-circuits via `reuse.find_reusable_resume`, then calls `run_tailor_pipeline` in `apps/wyrdfold-api/app/services/tailor/pipeline.py`. The pipeline calls `tailor_resume` (`apps/wyrdfold-api/app/services/tailor/tailor.py`), which composes a user message via `build_user_message` and submits it with the static `TAILOR_SYSTEM` constant defined in `apps/wyrdfold-api/app/services/tailor/prompts.py` (cached as a prompt-cache target). The LLM returns a `TailoredResume`, which is trace-validated, markdown-rendered (`markdown_render.py`), linted, docx-rendered via Pandoc, persisted to the `documents` table, and returned as a `TailorResponse`.

Today, "rules" live **entirely hard-coded in `TAILOR_SYSTEM`** — section list (Summary/Experience/Skills/Education), bullet caps (4/3/2 across recency), style ("no em dashes", "≤ 280 chars", action verbs, no filler list), ATS constraints, summary length, and a fixed skills cap of 20. Per-user `PreferencesPayload` (`rules`, `avoid`, `tone_notes`) and per-target annotations layer in as user-message sections, but nothing structurally varies the **shape** of the resume. A `resume_type` field already exists end-to-end (`Literal["senior-frontend", "fullstack", "frontend-lead", "generic"]` in `apps/wyrdfold-api/app/models/tailor.py` line 25), is accepted by `TailorRequest` and `BatchRequest`, is forwarded into the user message as `[ResumeType] {value}`, is persisted on the row, and is exposed on the frontend `TailoredResumeRecord` (`apps/wyrdfold/src/app/(app)/jobs/types.ts` line 157). **But the UI never sets it** — `handleGenerate` omits it, so every resume is `"generic"`, and the system prompt has zero instructions keyed off it. `resume_type` is a vestigial slot waiting for a real template system.

## 2. What a template actually is

Proposed shape (TypeScript-flavored; mirror with a Pydantic `ResumeTemplate`):

```ts
interface ResumeTemplate {
  id: string; // 'engineering-conservative'
  label: string; // 'Engineering — Conservative'
  description: string; // shown in picker tooltip
  audience_hint: string; // 'Big-tech, Fortune 500, regulated industries'

  // Structure: ordered sections with optional per-section caps
  sections: TemplateSection[];

  // Style metadata consumed by docx renderer (overlaps with docx-styling investigation)
  style: {
    tone: 'conservative' | 'modern' | 'minimal' | 'executive';
    docx_theme_id: string; // resolves to a styles.xml variant; out of scope here
  };

  // Per-template prompt overrides + additions
  prompt_fragment: string; // injected into TAILOR_SYSTEM after the constant
  bullet_caps: { recent: number; mid: number; old: number };
  summary_sentences: [number, number]; // e.g. [2, 3]
  skills_cap: number;
  allow_first_person: boolean;
}

interface TemplateSection {
  kind:
    | 'summary'
    | 'experience'
    | 'skills'
    | 'education'
    | 'projects'
    | 'certifications';
  required: boolean;
  order: number;
  rules: string[]; // ["Lead with metric", "≤ 2 lines per bullet"]
}
```

**Structure** drives section ordering in `markdown_render.to_markdown` (currently linear/hard-coded — needs to iterate `template.sections`). **Rules** are flattened into the per-section block of the prompt fragment. **Style metadata** is read by the docx renderer (separate investigation owns that). **Prompt fragment** is appended to `TAILOR_SYSTEM` as the variable tail and breaks prompt caching for the appended chunk — see §6.

## 3. Storage

**Recommended: markdown files checked into the repo with YAML frontmatter**, loaded at FastAPI startup into an in-memory dict keyed by `id`. Place them at `apps/wyrdfold-api/app/services/tailor/templates/*.md`. Frontmatter holds the structured fields (sections, bullet_caps, style); body is the `prompt_fragment` (easier to author and diff than a JSON blob with `\n` escapes). Rationale: v1 templates are author-curated, change infrequently, ship with releases, are visible in PR review, are testable as fixtures, and need no migration. The existing `resume_type` column on `documents` is repurposed to store the template `id` (string already — no schema change). A `resume_templates` DB table is only needed at v3 when users edit their own.

## 4. UI affordance

Default behavior should not regress: `handleGenerate` resolves `default_template_id` in order: (1) per-target default on `targets.default_template_id` (v2), (2) per-user default on `user_profiles.default_template_id` (v2), (3) global `'engineering-modern'`. The CTA stays a single button by default; clicking it generates with the resolved default. Add a small caret-disclosure adjacent to the button (`<Button name='generate-resume' />` + `<Dropdown />` from `@danieljoffe/shared-ui`) listing templates with a checkmark on the resolved default. The detail panel shows the template badge on the `TailoredResumeRecord` (using `record.resume_type` — already present). Cover-letter generation gets the same picker for parity.

## 5. API surface

- **`GET /tailor/templates`** — list `ResumeTemplate` summaries (`id`, `label`, `description`, `audience_hint`). Add to `apps/wyrdfold-api/app/routers/tailor.py`. Public to authed users; cached client-side since templates are static.
- **`GET /tailor/templates/{id}`** — full template (sections + rules + prompt_fragment). Optional; only needed if UI previews rules.
- **Overload existing `POST /tailor/resume`** by adding `template_id: str | None = None` to `TailorRequest`. Same for `BatchRequest`. Backward-compatible — null falls through to `'generic'` (today's behavior). Reject unknown IDs with 422.
- No new endpoints for resumes — `TailoredResumeRecord.resume_type` already round-trips the chosen template.

## 6. Migration cost

**Prompt lift is moderate.** `TAILOR_SYSTEM` currently inlines the entire rules surface; the template work refactors it into a base (hallucination containment, ATS, output format — universally true) plus a per-template fragment appended to the static system message. The base stays cacheable; the fragment lives in the user message under `[TemplateRules]` to preserve the existing cache hit. That maps cleanly onto how `[ResumeType]`, `[Preferences]`, `[Annotations]` already work in `build_user_message` (`tailor.py` lines 34–62). **Re-tuning is required** for v1 templates: each gets a few sample JDs run through it during authoring; outputs reviewed; rules iterated. Budget ~1 day per template. **Existing resumes are untouched** — `documents` rows keep their `resume_type` (now meaning template id; old rows = `'generic'`, which v1 ships as a real template alias). Versioned `ResumeVersion` history is also unaffected since templates only influence new LLM generations.

## 7. Phasing

- **v1 (~3 days)**: 2–3 curated markdown templates checked in (`engineering-modern`, `engineering-conservative`, `executive-brief`). `GET /tailor/templates` list endpoint. `template_id` field on `TailorRequest`/`BatchRequest`. UI: dropdown next to the "Generate Resume" button on `JobDetailPanel`/`ResumeSection`; default = `engineering-modern`. Prompt refactor splits `TAILOR_SYSTEM` into base + per-template fragment. `markdown_render.to_markdown` iterates `template.sections` instead of hard-coding section order.
- **v2 (~1 day)**: `targets.default_template_id` and `user_profiles.default_template_id` columns + settings UI. Resolution order in `handleGenerate`.
- **v3 (~1 week)**: `resume_templates` DB table for user-authored variants (clone-and-edit a curated one). Lint guard against runaway rules; preview mode that shows the rendered prompt fragment.

---

**Cited code**: `apps/wyrdfold-api/app/services/tailor/{prompts.py, tailor.py, pipeline.py, markdown_render.py, persistence.py, reuse.py}`, `apps/wyrdfold-api/app/models/{tailor.py, batch.py}`, `apps/wyrdfold-api/app/routers/tailor.py`, `apps/wyrdfold/src/app/(app)/jobs/{ResumeSection.tsx, BatchActionBar.tsx, types.ts}`, `apps/wyrdfold/src/app/(app)/jobs/[id]/resume/ResumeReviewPage.tsx`, `apps/wyrdfold/src/app/api/jobs/tailor/resume/route.ts`.
