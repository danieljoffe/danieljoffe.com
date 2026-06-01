# Research: Markdown Editor for Wyrdfold Resume & Cover Letter Review

Date: 2026-05-31
Status: Research / proposal only — not implemented.

## 1. Current state

Both review pages (`apps/wyrdfold/src/app/(app)/jobs/[id]/resume/ResumeReviewPage.tsx`, `apps/wyrdfold/src/app/(app)/jobs/[id]/cover-letter/CoverLetterReviewPage.tsx`) render the markdown directly into a plain `<textarea>` (resume line 713, cover-letter line 679) styled with `font-mono text-sm`. There is no rendered preview today — users see raw markdown source. A grep of `apps/wyrdfold/package.json` and the workspace root confirms **no markdown library is installed anywhere in wyrdfold** (no `react-markdown`, `remark`, `marked`, `markdown-it`, `tiptap`, `lexical`, `milkdown`, or `codemirror`). The only existing markdown tooling in the repo is MDX (`@mdx-js/react`, `@next/mdx`) which is used by the `root` site's blog and is unsuitable for runtime user input.

Storage is already markdown-first: the API treats `payload_md` (string, max 50 000 chars) as the source of truth (`apps/wyrdfold-api/app/models/tailor.py` — `ResumeEditRequest.markdown`). The page autosaves with a 1500ms debounce by PATCHing `/api/jobs/tailor/{id}` with `{ markdown }`. A 422 response returns `{ detail: { violations: LintViolation[] } }` (`apps/wyrdfold-api/app/services/ats_lint/markdown_linter.py`) which the UI surfaces in a banner. `LintViolation` is `{ code, message, severity }` and lives in `apps/wyrdfold/src/app/(app)/jobs/types.ts`. Version snapshots, approve/unapprove, and `navigator.sendBeacon` flush on `pagehide` are already wired around the same `markdown` state variable. The docx renderer (pandoc) consumes `payload_md` directly — no structured payload is required for the edit/save loop.

## 2. Editor library survey

| Library                                    | Bundle (gz, core)\*                                       | React 19 / `forwardRef`                                                                                    | MD round-trip                                                                                                     | Customization cost                                                               |
| ------------------------------------------ | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **TipTap v3** (ProseMirror)                | ~80–120KB with starter-kit + `tiptap-markdown`            | Native React 19 hooks API; no `forwardRef` reliance in v3                                                  | Good via `tiptap-markdown` extension; some normalization (smart quotes, list markers)                             | Medium — node/mark schema must be curated to ATS-safe set (no images, no tables) |
| **Lexical** (Meta)                         | ~50–70KB core + ~30KB markdown plugin                     | First-class React 19; uses modern hooks                                                                    | `@lexical/markdown` does round-trip but headings/lists only — code blocks and links require explicit transformers | High — Lexical is a framework; you ship nodes + commands + toolbar yourself      |
| **Milkdown** (ProseMirror, markdown-first) | ~150–200KB with commonmark + gfm + listener               | React 19 compatible (v7+); uses `@milkdown/react`; some internal refs but no app-level `forwardRef` needed | Excellent — markdown is the canonical representation, not a serializer afterthought                               | Low–medium — opinionated theming, plugin ecosystem matches the use case          |
| **CodeMirror 6** + preview pane            | ~60KB editor + ~30–50KB markdown renderer (e.g. `marked`) | Vanilla TS, framework-agnostic; wrap manually, no React-specific issues                                    | Trivial — user edits raw markdown, preview renders it. Zero round-trip risk                                       | Lowest — split-pane UI, no WYSIWYG, matches current mental model                 |
| Monaco                                     | ~1MB+                                                     | —                                                                                                          | —                                                                                                                 | Overkill for prose. **Skip.**                                                    |

\* Numbers are approximate gzipped sizes for the minimum useful feature set; real-world depends on plugins chosen.

**React 19 forwardRef constraint** (per `CLAUDE.md` coding conventions): the `shared-ui` library must not use `forwardRef`; React 19 props-as-ref pattern is preferred. TipTap v3, Lexical, and Milkdown all expose ref-free React APIs that work without app-level forwardRef. CodeMirror 6 is framework-agnostic and sidesteps the question entirely.

## 3. Recommended path

**TipTap v3 with the `tiptap-markdown` extension and a curated schema** (no tables, no images, no inline HTML — mirroring the existing ATS lint rules in `markdown_linter.py`).

Reasons:

1. The "preview by default, click into edit mode" vision needs **true WYSIWYG**, not a split pane. CodeMirror would force a layout regression (two panes for non-technical users).
2. Markdown is already the API contract; TipTap's `tiptap-markdown` extension serializes deterministically and we can pin a normalization function on save.
3. The schema can be **locked to the exact set the ATS linter accepts** (headings, paragraphs, bullet lists, bold/italic, links). Any feature the linter rejects (tables, images) is simply not in the schema, so the user can't create lint-failing content via the UI.
4. Active maintenance, large React 19-ready ecosystem, predictable bundle.

Milkdown is a close second but its plugin churn is higher and theming over Tailwind 4 requires more wiring. Lexical is excellent but the markdown plugin's gaps (links, code) mean we'd write transformers ourselves — not worth it for a personal product. CodeMirror is the right pick **only if** the WYSIWYG vision is dropped.

## 4. Architecture sketch

Component shape:

```ts
interface MarkdownPreviewEditorProps {
  value: string;
  onChange: (next: string) => void;
  onBlur?: () => void; // hook for the flush-on-blur flow
  disabled?: boolean; // approved/locked
  ariaLabel: string;
  className?: string | undefined;
}
```

Location: **`apps/wyrdfold/src/components/MarkdownPreviewEditor/`** (Next.js-adjacent kit, not shared-ui). Rationale: TipTap pulls ProseMirror which is heavy and wyrdfold-specific; `shared-ui` is meant for React + Tailwind only and is reused by the portfolio site, which shouldn't pay the bundle cost. Mark the component `'use client'`.

State swap:

- A single `<div tabIndex={0}>` wraps the TipTap `EditorContent`. The editor is mounted in `editable: false` mode by default, so it renders as a styled preview.
- On `focus` (capture phase, or on click), call `editor.setEditable(true)` and `editor.commands.focus()`.
- On `blur` (when `relatedTarget` is outside the wrapper — to avoid flipping while the user clicks a toolbar button), call `editor.setEditable(false)` and invoke `onBlur` which the parent uses to `flushPendingSave()`.
- `onChange` fires from TipTap's `onUpdate` callback, which calls `editor.storage.markdown.getMarkdown()` and pushes the string through the same `setMarkdown` setter the pages use today. The existing 1500ms autosave debounce keeps working unchanged.

Toolbar (optional, only visible in edit mode): bold / italic / heading level / bullet list. Hidden when `editable === false`.

## 5. Migration cost

- **API**: zero changes. The PATCH endpoint already accepts `{ markdown: string }`, the lint pipeline runs unchanged, the docx render already keys off `payload_md`.
- **Frontend**: in `ResumeReviewPage.tsx` and `CoverLetterReviewPage.tsx`, replace the `<textarea …>` block (resume lines ~713–740, cover-letter lines ~679–705) with `<MarkdownPreviewEditor value={markdown} onChange={…} onBlur={flushPendingSave} disabled={isApproved} ariaLabel="…" />`. The surrounding "save status" UI, lint warnings banner, dropdown actions, and version history all stay as-is.
- **Tests**: both `__tests__/*ReviewPage.spec.tsx` use jest + RTL and only assert on toast/state — not on the textarea itself. Two small updates: replace the `aria-label='Resume markdown'` query with the new wrapper's `aria-label`, and add a smoke test for the preview→edit→blur flip. TipTap needs `jest-environment-jsdom` (already in use) plus a `contentEditable` shim — a known small jest config tweak.
- **Bundle**: ~100–130KB gzipped added to the `(app)/jobs/[id]/resume` and `…/cover-letter` route chunks. Acceptable for behind-auth routes; should not affect the marketing/blog Lighthouse budget on `apps/root`.
- **Dependencies to add** to `apps/wyrdfold/package.json`: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `tiptap-markdown`. All ship ESM and are tree-shake-friendly.

## 6. Risks

- **Autosave vs approve-version model**: TipTap's `onUpdate` fires on every keystroke and can be noisier than `<textarea onChange>`. The 1500ms debounce in `useEffect` already gates this — but we must throttle `onUpdate` to avoid React state thrash. Mitigation: feed `onUpdate` through `requestAnimationFrame` or compare against the last serialized markdown before calling `onChange`.
- **Markdown round-trip drift**: `tiptap-markdown` may normalize whitespace, ordered-list markers, or smart quotes. If the user opens, blurs without editing, and an autosave fires with normalized markdown, the server may re-emit it and silently mutate version history. Mitigation: skip the autosave if `serialized === lastLoadedMarkdown`; only fire `onChange` on **actual** content change (TipTap exposes `editor.isFocused` and a transaction `docChanged` flag).
- **Lint compatibility**: the schema must exclude everything the ATS linter forbids — tables, images, inline HTML, and headings deeper than `###`. If the schema and linter diverge, users get a 422 from a UI element they thought was safe. Mitigation: write a single-source-of-truth list of allowed nodes and unit-test it against `lint_markdown` fixtures.
- **`LintViolation` surface**: violations come back from the server in the existing banner. No editor-side change required, but we could decorate offending ranges later — out of scope for v1.
- **Locked (approved) state**: with `editable: false` permanently set when `isApproved`, the editor renders as a preview and the click-to-edit affordance must be suppressed. Already covered by the `disabled` prop.
- **Restore-version flow**: `restoreVersion()` calls `setMarkdown(md)` directly. TipTap needs `editor.commands.setContent(md)` to mirror. Wrap this in a `useEffect` that syncs `value` → editor when the prop changes externally.
- **Diff against base resume**: out of scope for the editor itself; a future "show diff vs source" feature would need a separate component but is not blocked by this work.

---

**Word count**: ~1180.
