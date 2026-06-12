# Wyrdfold Resume DOCX Styling — Research Report

_Scope: user-controllable typography, spacing, and color for the tailored-resume `.docx` export. Templates and the markdown editor are covered by separate reports._

## 1. Current State

There are **two** docx code paths in `apps/wyrdfold-api/app/services/docx/`:

- **`pandoc_render.py`** — the **active** renderer. Spawns `pandoc -f markdown -t docx -o -` over the row's `payload_md` (see `apps/wyrdfold-api/app/routers/tailor.py:546` `download_tailored_resume`). All styling is whatever pandoc's built-in `reference.docx` defaults are. Output is cached in Supabase Storage and keyed by `md_payload_hash(payload_md)` (sha256) via `docx_payload_md_hash` on the `tailored_resumes` row.
- **`renderer.py`** — legacy structured renderer using `python-docx>=1.1` (`pyproject.toml`). Builds the document run-by-run from `TailoredResume`/`TailoredCoverLetter` (`app/models/tailor.py`). Per its docstring it is "going away," but still imported from `app/services/docx/__init__.py` and exercised by `tests/test_docx_renderer.py`.

Both paths are **single-style, hard-coded, single-column, Calibri-only**, no user input. The legacy renderer explicitly forces `run.font.name = "Calibri"` on the title heading and otherwise uses python-docx's built-in styles (`List Bullet`, heading levels). Pandoc inherits its internal reference-doc defaults. There is no `resume_style`/preferences field anywhere in `app/models/tailor.py`, `app/models/user_profile.py`, or `apps/wyrdfold/src/app/(app)/jobs/types.ts`.

The frontend has no styling affordance — only `BatchActionBar.tsx` ("Export (.zip)") and per-resume download buttons in `ResumeSection.tsx`. The `/settings` route exists (`apps/wyrdfold/src/app/(app)/settings/SettingsPage.tsx`) and is the natural home for global defaults.

## 2. Library Capabilities

### `python-docx` (legacy renderer path)

Direct, fine-grained control — what you'd want if styling becomes a product feature:

- **Font family per run/paragraph**: `run.font.name = "Inter"` (also requires setting `w:eastAsia` via `rPr` XML for cross-platform reliability).
- **Font size**: `run.font.size = Pt(11)`.
- **Weight/italic**: `run.bold`, `run.italic`.
- **Color**: `run.font.color.rgb = RGBColor(0x1F, 0x29, 0x37)`.
- **Paragraph spacing**: `paragraph.paragraph_format.space_before = Pt(6)`, `.space_after`, `.line_spacing = 1.15`.
- **Section margins**: `section.top_margin = Inches(0.5)` etc. on `doc.sections[0]`.
- **Word "styles" inheritance**: Modify `doc.styles['Heading 1'].font` once; all `add_heading(level=1)` calls inherit. **Preferred** — single source of truth and matches how Word users edit theme fonts.

**Cannot** reliably do: arbitrary CSS-style layout, web-font embedding (must rely on fonts the reader has installed — stick to Calibri / Arial / Georgia / Helvetica or embed via `w:embedRegular` XML hacking), guaranteed cross-Word-version pagination, kerning beyond what Word exposes.

### `pandoc` (active path)

Styling is via a `--reference-doc=reference.docx` flag — a Word template whose styles pandoc copies into the output. This means user choices must be **materialized into a reference docx** (either prebuilt per preset or generated on the fly with `python-docx`, then passed via temp file). Pandoc itself takes no per-run flags.

**Trade-off**: keeping pandoc means we either ship a small set of reference docs (Compact/Comfortable × 3 fonts) or generate one per user. Switching back to the structured renderer gives direct control but loses pandoc's markdown niceties.

## 3. Proposed Settings Shape

Pydantic model in `app/models/user_profile.py` (new) + matching TS in `jobs/types.ts`:

```json
{
  "font_family": "Calibri", // enum: Calibri | Arial | Georgia | Helvetica | Inter
  "name_size_pt": 18, // 14–28
  "section_heading_size_pt": 11, // 10–16
  "body_size_pt": 10, // 9–12
  "line_height": 1.15, // 1.0–1.5
  "accent_color_hex": "#1F2937", // applies to name + section headings only
  "spacing": "comfortable" // "compact" | "comfortable" — drives margins + paragraph spacing presets
}
```

Constraints are enforceable via Pydantic `Field(ge=, le=, pattern=)`. Validating `font_family` against an allowlist avoids embedding-license footguns. `spacing` as a preset (not raw `space_after_pt`) keeps the UI surface small.

## 4. Storage

**Recommended: user default + per-resume override.**

- New table column `user_profiles.resume_style_settings JSONB` (single row per user) — the default applied to every new tailoring.
- New nullable column `tailored_resumes.style_settings JSONB` — populated at render time from the user's default and frozen with the record so re-rendering an old resume stays deterministic. Editing the style for a single approved/unapproved record is a discrete operation.
- The docx cache key must include the style hash. Today `docx_payload_md_hash` keys on markdown only (`pandoc_render.md_payload_hash`); extend it to `sha256(payload_md + json.dumps(style, sort_keys=True))` so a style change re-renders. See `apps/wyrdfold-api/app/services/tailor/persistence.py:289 mark_docx_rendered`.

## 5. UI Affordance

Two surfaces, both already exist:

- **`/settings`** — new "Resume style" card under `SettingsPage.tsx`. Edits user default. Saves via new `PUT /api/user/resume-style`.
- **Resume review page** (`apps/wyrdfold/src/app/(app)/jobs/.../review/*`) — a collapsed "Style" disclosure above the download button that lets the user override for this resume only, with a "Save as my default" secondary action.

## 6. Live Preview

In-browser docx preview is fragile. Three viable options, in increasing fidelity / cost:

1. **No preview** — show a sample paragraph rendered in HTML/CSS that mimics the chosen typography. Cheap, ~80% accurate, no backend round-trip. Recommended for v1.
2. **Server-side PDF preview** — render docx → PDF via LibreOffice headless (`soffice --convert-to pdf`) and stream to an `<iframe>`. Reliable, ~1–2s latency, adds a system dependency.
3. **In-browser docx render** — `docx-preview` (npm) or `mammoth.js`. Both approximate Word styles in HTML/CSS — line breaks and pagination diverge from real Word. Acceptable but never byte-perfect.

Pure browser preview of pandoc-emitted docx is not worth the complexity. Start with option 1; add option 2 if users ask.

## 7. API Surface

```
GET    /api/user/resume-style                     → ResumeStyleSettings (default if unset)
PUT    /api/user/resume-style                     → updated settings
GET    /tailor/resumes/{id}/style                 → effective style for this record
PATCH  /tailor/resumes/{id}/style                 → per-record override; invalidates docx cache
```

Tailor request body (`POST /tailor/resume`) gains an optional `style_settings: ResumeStyleSettings | null` — `null` means "use my profile default at render time."

## 8. Migration Cost

Low. Existing rows have `style_settings IS NULL`; the renderer falls back to today's hard-coded Calibri defaults — pixel-identical output. New exports honor the user setting. The cache-key change is backwards-compatible (old hashes still match for null-style rows). One Supabase migration adds two JSONB columns, neither indexed.

**Recommendation**: do this work on top of the **structured `python-docx` renderer** (revive `renderer.py`) rather than pandoc — direct styling control is exactly the use case `python-docx` is good at, and pandoc's reference-doc indirection adds complexity for no upside once the markdown editor lands.

## Key paths

- `apps/wyrdfold-api/app/services/docx/renderer.py` — legacy structured renderer (python-docx).
- `apps/wyrdfold-api/app/services/docx/pandoc_render.py` — active pandoc renderer.
- `apps/wyrdfold-api/app/services/docx/__init__.py` — public exports.
- `apps/wyrdfold-api/app/routers/tailor.py:336` — `/resumes/export-zip`.
- `apps/wyrdfold-api/app/routers/tailor.py:546` — `/resumes/{id}/download` (lazy re-render).
- `apps/wyrdfold-api/app/services/tailor/persistence.py` — `upload_docx`, `mark_docx_rendered`, hash gate.
- `apps/wyrdfold-api/app/models/tailor.py` — `TailoredResume`, `TailoredCoverLetter`, `TailoredResumeRecord`.
- `apps/wyrdfold-api/app/models/user_profile.py` — where `ResumeStyleSettings` would live.
- `apps/wyrdfold-api/pyproject.toml` — `python-docx>=1.1` already a dep.
- `apps/wyrdfold/src/app/(app)/jobs/ResumeSection.tsx` — per-resume download UI.
- `apps/wyrdfold/src/app/(app)/jobs/BatchActionBar.tsx` — bulk export UI.
- `apps/wyrdfold/src/app/(app)/jobs/types.ts:135` — `TailoredResumePayload`.
- `apps/wyrdfold/src/app/(app)/settings/SettingsPage.tsx` — settings page host.
