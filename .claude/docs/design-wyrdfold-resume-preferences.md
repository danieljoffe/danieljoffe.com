# Wyrdfold Resume Preferences — Unified Data Model (Design Sketch)

_Date: 2026-06-01. Synthesizes the two parallel investigations ([content templates](research-wyrdfold-resume-templates.md), [docx styling](research-wyrdfold-docx-styling.md)) into one preferences model._

> **Status:** v1 (visual style presets) is being implemented on branch `feat/wyrdfold-resume-style-presets`. The content-template axis is explicitly deferred. The decision narrative behind this design lives in [decision-wyrdfold-resume-style-presets.md](decision-wyrdfold-resume-style-presets.md).
>
> **Key pivot from the original sketch:** style is exposed as **curated presets + a fixed accent palette**, _not_ à la carte font/size/spacing controls. Presets make ugly combinations unreachable, collapse the model to two enums, and let the renderer use **prebuilt-style reference docs** instead of per-field validation. See the [decision doc](decision-wyrdfold-resume-style-presets.md) for why.

## Core principle: two stores, one surface

A user "resume preference" is **two orthogonal axes** that happen to share a UI:

| Axis                 | Controls                                   | Applies at         | Owner          | Change cost            |
| -------------------- | ------------------------------------------ | ------------------ | -------------- | ---------------------- |
| **Content template** | sections, order, bullet caps, prompt rules | LLM **generation** | author-curated | expensive (re-run LLM) |
| **Visual style**     | font, size, color, spacing, margins        | docx **render**    | user-editable  | cheap (re-render docx) |

They are stored and applied **separately**. They are _presented_ together as one "Resume preferences" panel. The one rule that must never break: **a style change must never trigger an LLM call.** Bundling both into a single "preset" object with one apply-handler is the trap — it leads to bumping a font size silently regenerating content.

## Data shapes

### Style — two enums, not seven fields (`app/models/user_profile.py`)

```python
ResumeStylePreset = Literal["modern", "classic", "compact", "executive"]
ResumeStyleAccent = Literal["slate", "navy", "black", "burgundy", "forest"]

class ResumeStyleSettings(BaseModel):
    preset: ResumeStylePreset = "modern"
    accent: ResumeStyleAccent = "slate"
```

The seven typography fields from the original sketch don't disappear — they become an **internal server-side lookup table** keyed by `preset` (`app/services/docx/style.py`), never user input. Validation is two allowlist checks. A user cannot produce a broken-looking resume; the only choices are between designer-vetted looks.

### Preset catalog (the server-side lookup, `app/services/docx/style.py`)

| Preset      | Font      | Body | Name | Heading | Line | Spacing | Intended audience              |
| ----------- | --------- | ---- | ---- | ------- | ---- | ------- | ------------------------------ |
| `modern`    | Calibri   | 10.5 | 20   | 12      | 1.12 | normal  | default; product/tech roles    |
| `classic`   | Georgia   | 10.5 | 22   | 13      | 1.15 | normal  | serif, traditional industries  |
| `compact`   | Calibri   | 10   | 18   | 11      | 1.0  | tight   | 2-page-into-1, dense history   |
| `executive` | Helvetica | 11   | 24   | 13      | 1.2  | airy    | senior/leadership, white space |

Accents apply to **name + section headings only** (ATS parsers ignore color):

| Accent     | Hex       | Note                                 |
| ---------- | --------- | ------------------------------------ |
| `slate`    | `#1F2937` | default                              |
| `navy`     | `#1E3A5F` |                                      |
| `black`    | `#000000` | conservative / ATS-strict / no color |
| `burgundy` | `#6B1F2A` |                                      |
| `forest`   | `#1E4034` |                                      |

### Content template (deferred)

Not in v1. When built: a curated markdown file keyed by `id`, reusing the free-`str` `resume_type` column. See the [content-templates research](research-wyrdfold-resume-templates.md).

### Content template (curated, author-owned, string id)

No user-editable model in v1. A template is a curated markdown file loaded at startup, keyed by `id`. The **id is the only thing that round-trips** through user data — reusing the existing free-`str` `resume_type` column. Users _select_ an id; they do not _edit_ template internals until v3.

## Storage (one migration, additive — v1 ships only the style columns)

```
user_profiles
  + resume_style_settings  JSONB  NULL   -- user default style {preset, accent}   [v1]
  + default_template_id    TEXT   NULL   -- user default content template          [deferred]

documents
  + style_settings         JSONB  NULL   -- per-record override {preset, accent}    [v1]
    resume_type            TEXT          -- REPURPOSED to hold template id           [deferred]
```

Both columns nullable, unindexed. **`NULL` is the load-bearing default:** a row/profile with `resume_style_settings IS NULL` renders with no `--reference-doc` — byte-for-byte today's pandoc output, and the existing markdown-only cache hash still matches. Only once a user picks a style does the styled path engage. This preserves the "pixel-identical existing rows, zero forced re-render" promise.

## Resolution order (render time only — there is no generation-time style)

```
effective_style = record.style_settings           (per-record override; deferred UI)
              ?? user_profiles.resume_style_settings   (the user's saved default)
              ?? None  → today's unstyled pandoc default
```

Resolved in `download_tailored_resume` (`app/routers/tailor.py`). Applies to both resumes and cover letters (same download-by-id path, same typography). **No LLM is ever involved** — a style change only changes the docx hash, forcing a cheap re-render on next download.

## API surface (additive, backward-compatible)

```
# Style — user default (v1)
GET    /profile/resume-style       -> ResumeStyleSettings (default {modern, slate} if unset)
PATCH  /profile/resume-style       -> merge {preset?, accent?}, return effective settings

# Per-record override + content templates -> deferred
```

Mirrors the existing `/profile/notifications` + `/profile/identity` pattern (JWT-scoped, `_get_or_create_profile`). Frontend proxy at `apps/wyrdfold/src/app/api/profile/resume-style/route.ts`. The `TailorRequest` is **unchanged** in v1 — style is resolved at download, not passed at generation.

## Renderer — prebuilt-style reference docs (pandoc stays)

The preset model **defuses the pandoc-vs-python-docx decision.** Instead of reviving the structured renderer, v1 keeps pandoc and feeds it a styled `--reference-doc`:

1. `build_reference_docx(style)` (`app/services/docx/style.py`, `@lru_cache` by `(preset, accent)`): materialize pandoc's default reference doc (`pandoc --print-default-data-file reference.docx`), open with `python-docx`, mutate the `Normal` / `Title` / `Heading 1-3` styles per the preset's typography + accent color, return bytes. Cached — built at most once per of the 20 combos.
2. `md_to_docx(markdown, style=None)`: when `style` is set, write the reference bytes to a temp file and pass `--reference-doc`; when `None`, today's exact invocation.

This is verified working on pandoc 3.9 + python-docx 1.2. No checked-in binary assets, no per-render generation cost after the first.

## Cache key (the easy-to-miss bug — fixed)

`md_payload_hash(markdown, style=None)` in `pandoc_render.py`:

- `style is None` → `sha256(md)` — **identical to today**, existing cache entries stay valid.
- `style` set → `sha256(md + "\x00" + preset + "\x00" + accent)` — a style change invalidates the cached docx so the next download re-renders.

Threaded through both the freshness check and `mark_docx_rendered` in `download_tailored_resume`.

## UI (v1)

- **`/settings`** — a "Resume style" `Card` in `SettingsPage.tsx`, matching the existing Card + debounced-autosave + `SavingIndicator` + toast idiom. Two `Select`s (preset, accent) + a live HTML sample paragraph that restyles instantly (no backend round-trip). Writes `user_profiles.resume_style_settings`.
- **Resume review page (deferred)** — per-record "Style" disclosure with "Save as my default".

## Deferred (not in this PR)

1. Per-record style override (`documents.style_settings` column ships now; the PATCH endpoint + review-page UI come later).
2. The entire content-template axis (`default_template_id`, prompt fragments, section ordering).
3. Free-hex accent / additional presets — additive when a real request surfaces.

---

**Cited code**: `apps/wyrdfold-api/app/models/{user_profile.py, tailor.py}`, `apps/wyrdfold-api/app/services/docx/{pandoc_render.py, style.py, renderer.py}`, `apps/wyrdfold-api/app/services/tailor/persistence.py`, `apps/wyrdfold-api/app/routers/{tailor.py, user_profile.py}`, `apps/wyrdfold/src/app/(app)/settings/SettingsPage.tsx`, `apps/wyrdfold/src/app/api/profile/resume-style/route.ts`.
