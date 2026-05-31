# Research: LLM-Driven Highlight Overlay on the JD

Date: 2026-05-31 — scope: WyrdFold job detail JD inline highlights for pros/cons.

## 1. Current state

The JD body is **sanitized HTML**, not markdown. Upstream sources (e.g. Greenhouse) emit entity-encoded HTML stored on `job_postings.description_html`. On the server, `apps/wyrdfold-api/app/services/sanitize.py` runs `bleach.clean` against a tight allowlist: `p, br, ul, ol, li, strong, em, b, i, u, a, h1..h6, blockquote, code, pre, span, div`. **`<mark>` is not allowed today.** On the client, `JobDetailPanel` (`apps/wyrdfold/src/app/(app)/jobs/JobDetailPanel.tsx:283-311, 545-560`) decodes the entities via a `<textarea>` round-trip, runs them through `isomorphic-dompurify` (dynamic-imported), then renders with `dangerouslySetInnerHTML` inside a `prose prose-sm` `<details>` block. The detail page (`apps/wyrdfold/src/app/(app)/jobs/[id]/JobDetailPage.tsx`) just wraps the same panel with `defaultDescriptionOpen`. There is no plain-text JD field on the wire today.

Analysis output today comes from `score_and_upsert` in `apps/wyrdfold-api/app/services/target_scoring.py` and `apps/wyrdfold-api/app/services/analysis/scoring.py`. The structured payload is `Scorecard { skills_matched: SkillMatch[]; skills_missing; nice_to_haves; seniority_fit; seniority_rationale; domain_fit; domain_rationale }` (see `apps/wyrdfold/src/app/(app)/jobs/types.ts:55, 122-141`). No span/offset annotations exist yet.

## 2. Storage / annotation shape — recommend phrase-based for v1

**Recommended: phrase-based.** The JD goes through bleach (server) and DOMPurify (client), so server offsets do not match client-rendered offsets. We'd need a third, normalized representation of the JD to make offsets stable, which is significant churn for a v1 nicety.

```jsonc
// Extend JobAnalysis. New nullable column on job_target_analyses.
type AnalysisHighlight = {
  phrase: string;                        // verbatim substring of the JD text
  kind: "positive" | "negative";
  severity: 1 | 2 | 3;                   // 1 = mild, 3 = strong
  reason: string;                        // <= 140 chars, shown on hover
  occurrence?: number;                   // optional 0-indexed disambiguator
};
type Scorecard = { /* existing */ ...; highlights?: AnalysisHighlight[] };
```

The client walks text nodes, finds the _n_-th occurrence of each `phrase` (whole-token case-insensitive match, Unicode-NFC normalize), and wraps it. **Fail closed**: if the phrase is not found, drop the highlight silently and log a counter (`highlight.miss`) so we can tune the prompt. This is the same defensive pattern used in `_keyword_in_text` / `_strip_version` in `apps/wyrdfold-api/app/services/scoring.py`. Offset-based annotations stay on the v2 roadmap.

## 3. LLM prompt design — piggyback Stage 2

Stage 2 (`target_scoring.score_and_upsert`) already calls Anthropic with the full JD and returns a tool-use `Scorecard`. Adding a `highlights: AnalysisHighlight[]` field to that tool schema costs ~200–600 output tokens per call (well under the existing `max_tokens=4096` cap). At Sonnet 4.6 rates (`apps/wyrdfold-api/app/services/llm/pricing.py`: $15/Mtok output) that's roughly **$0.003–$0.009/job**, negligible relative to the current spend. Constraints worth baking into the prompt:

- "Quote phrases verbatim, ≤ 6 words each, ≤ 12 total, drawn from the JD only."
- "Severity 3 only for must-haves the candidate clearly meets or misses."
- "Do not paraphrase. If unsure, omit."

No separate call. A separate call doubles latency and breaks our cost-log purpose grouping.

## 4. Rendering — post-process sanitized HTML, wrap text nodes

Since the JD is already sanitized HTML on the client, parse it with the browser's `DOMParser` (no extra dep — `isomorphic-dompurify` already runs client-side), walk text nodes via a `TreeWalker(NodeFilter.SHOW_TEXT)`, and replace text-node ranges with `<mark data-kind data-severity title="…">`. Then serialise via `innerHTML` and re-run DOMPurify with `ADD_TAGS: ['mark']` and `ADD_ATTR: ['data-kind','data-severity','title']`. We _also_ extend the server bleach allowlist with `mark` + those attrs so server-rendered snippets (e.g. emails, cover-letter context) match.

XSS posture: the highlight payload from the LLM is **data-only**: `phrase`, `reason`, `kind`, `severity`. We never inject `phrase` as HTML — we match it against text-node contents. `reason` enters as a `title=` attribute (or Tooltip prop), so DOMPurify's attribute filter still catches event handlers. Net new attack surface: zero, as long as we keep the post-process inside the existing sanitize pipeline.

Rejected alt: rendering the JD as markdown via the markdown editor work tracked in `.claude/docs/research-wyrdfold-markdown-editor.md`. Cleaner traversal, but blocked on that effort landing and on upstream JDs being markdown-clean. Phase 2.

## 5. Color scheme — wire to existing pyre tokens

Confirmed tokens in `libs/shared/ui/src/styles/pyre-theme.css:99-106, 151-158`: `--color-success`, `--color-success-light`, `--color-warning`, `--color-warning-light`, `--color-error`, `--color-error-light`, `--color-info`, `--color-info-light` (light + dark mode). Tailwind exposes these as `bg-success`, `bg-info`, `bg-warning`, `bg-error`, etc. — already used in `STATUS_DOT_CLASS` (`types.ts:18-28`).

Mapping (use the `-light` background variants — they have far better contrast for inline text than `/15` opacity over arbitrary backgrounds):

| Kind     | Severity | Class                                                               |
| -------- | -------- | ------------------------------------------------------------------- |
| positive | 3        | `bg-success-light text-text-primary border-l-2 border-success px-1` |
| positive | 1–2      | `bg-info-light text-text-primary border-l-2 border-info px-1`       |
| negative | 1–2      | `bg-warning-light text-text-primary border-l-2 border-warning px-1` |
| negative | 3        | `bg-error-light text-text-primary border-l-2 border-error px-1`     |

Centralize in `apps/wyrdfold/src/app/(app)/jobs/highlightStyles.ts` per the Rule-of-Three convention in `.claude/docs/coding-conventions.md`.

## 6. Hover affordance

Use the existing `Tooltip` component at `libs/shared/ui/src/lib/Tooltip.tsx`. Wrapping every `<mark>` in a React Tooltip means hydrating the parsed HTML into React elements rather than a single `innerHTML` blob — a real refactor. **v1**: native `title=` attribute (zero extra JS, accessible to screen readers). **v2**: parse to React via `html-react-parser` and use `Tooltip` for richer content (severity label, "based on target X"). Skip Popover — overkill for a static reason string.

## 7. Toggle UI

Place the toggle inside `JobDetailPanel`'s description `<details>` `<summary>` row (`JobDetailPanel.tsx:545-555`): segmented control `[Job description] [Highlights ●]`. Persist with `localStorage` key `wf:jd-highlights:on` (default `true`). Use the existing pattern (see `apps/wyrdfold/src/state/Toast/ToastProvider` for client-state shape — but inline `useState` + `useEffect` is fine here, no provider needed). Don't ship it as a global setting; per-user-per-device localStorage covers the "noisy, hide it" use case without backend work.

## 8. Migration / phasing

- **v1 (1–2 days)**: Add nullable `highlights` to `Scorecard` schema (Pydantic + TS type). Extend the Stage 2 prompt. Add `<mark>` to bleach + DOMPurify allowlists. Add client post-process + native `title=` tooltips + localStorage toggle. Phrase-based, fail closed on miss.
- **v2**: Disambiguation (`occurrence` index, prefer "match phrases inside paragraphs that contain X"), severity calibration from offline eval set, Tooltip component upgrade.
- **v3**: Per-target highlights — analysis is already per-`user_target` (see `score_and_upsert`); the UI just needs to re-fetch on target change (it already does for the rest of the analysis card).

## 9. Risks

- **Over-highlighting noise**: cap at 12 spans, prefer severity 2–3, hide by default if `highlights.length > 20` and surface a "show all" button.
- **Hallucinated phrases**: phrase-based matching fails closed on miss. Log miss rate; if > 10% the prompt needs tightening.
- **Color contrast / WCAG 2.1 AA**: `success-light` / `error-light` over the JD's `text-text-primary` was designed for the Badge component; verify with axe — the JD lives in `prose`-styled text which is darker than the badge text. If `error-light` fails AA in dark mode, fall back to a 2px left border + `bg-transparent`.
- **Perf**: TreeWalker over a 5KB JD is <1ms; cache the wrapped HTML keyed by `(description_html, highlights)` via `useMemo`.
- **HTML normalization edge cases**: phrases that span tag boundaries (`<strong>5+ years</strong> of Python`) won't match a single text node. v1 accepts the miss; v2 can do a cross-node text-range match using `Range` APIs.

## Key file references

- `apps/wyrdfold/src/app/(app)/jobs/JobDetailPanel.tsx:283-311, 545-560`
- `apps/wyrdfold/src/app/(app)/jobs/[id]/JobDetailPage.tsx`
- `apps/wyrdfold/src/app/(app)/jobs/types.ts:55, 122-141`
- `apps/wyrdfold-api/app/services/sanitize.py`
- `apps/wyrdfold-api/app/services/target_scoring.py` (`score_and_upsert` at L129)
- `apps/wyrdfold-api/app/services/analysis/scoring.py` (`scorecard_to_numeric`, `blend_scores`)
- `apps/wyrdfold-api/app/services/llm/anthropic_client.py` (`complete_tool_use`)
- `apps/wyrdfold-api/app/services/llm/pricing.py`
- `libs/shared/ui/src/styles/pyre-theme.css:99-106, 151-158`
- `libs/shared/ui/src/lib/Tooltip.tsx`
