# Decision Log — Resume Style Presets

_Date: 2026-06-01. Captures the design conversation that produced [design-wyrdfold-resume-preferences.md](design-wyrdfold-resume-preferences.md) and the `feat/wyrdfold-resume-style-presets` implementation._

## Origin

Three parallel research investigations had been run for the Wyrdfold tailored-resume flow:

- [research-wyrdfold-resume-templates.md](research-wyrdfold-resume-templates.md) — content templates (sections/rules/prompt fragments)
- [research-wyrdfold-docx-styling.md](research-wyrdfold-docx-styling.md) — user-controllable docx typography
- (a third, the markdown editor — since merged via PR #766)

The question that kicked this off: _"a user should be allowed to set their preferences for creating new resumes — from styling to setting a template for content. How would you solve this?"_

## The reasoning chain

1. **Verdict on the templates research:** sound, ship-able, but the effort estimates were optimistic and the `markdown_render.to_markdown` refactor (touches every resume) was the real risk, underweighted relative to the prompt work. The `ResumeTemplate` interface was over-specified for v1.

2. **The unifying insight — two orthogonal axes, not one feature.** "Resume preferences" is really:
   - **Content template** — sections/order/rules → affects **LLM generation** → author-curated, expensive to change, risky.
   - **Visual style** — font/color/spacing → affects **docx render** → user-editable, cheap to change, safe.

   They cross (conservative content × Inter typography is a valid combination). The invariant that falls out: **a style change must never trigger an LLM call.** Bundling them into one "preset" with one apply-handler is the trap.

3. **Sequencing call — style first.** Lower risk (no LLM, validated), higher felt value (people care intensely how a resume _looks_), and it builds the settings/override/cache scaffolding that templates would reuse. The user confirmed the template idea was "a curiosity, not dead set" — which made deferring it the obvious call.

4. **The preset pivot (the key product decision).** The original docx-styling sketch proposed à la carte controls — `font_family`, three size fields, `line_height`, `accent_color_hex`, `spacing`. The user pushed back: _"would it make more sense to let users pick a resume style, with a preset list of accent colors? This narrows the variance and avoids them messing up a perfectly good resume."_

   This is correct on every axis, and it's not just UX — it **simplifies the whole stack**:
   - **Model:** 7 validated fields → 2 enums (`preset`, `accent`).
   - **Validation:** seven `Field(ge/le)` ranges → two allowlist checks.
   - **Renderer:** prebuilt-style reference docs (one per preset/accent combo, `@lru_cache`d) instead of per-field python-docx generation. This **defuses the pandoc-vs-python-docx decision** — pandoc stays, fed a styled `--reference-doc`.
   - **Cache key:** two short strings instead of a JSON blob.
   - **UI:** a gallery of vetted looks instead of sliders/color pickers shared-ui doesn't have.

   What you give up — exact brand hex, arbitrary point sizes — is mostly users about to make their resume worse. Additive later if a real request surfaces.

5. **Refinements locked in:** keep `preset` and `accent` as separate axes (avoid an N×M combinatorial style explosion); include a pure-`black`/no-accent option and an all-black-friendly preset for conservative / ATS-strict / regulated contexts.

## Decisions taken into implementation

| Decision         | Choice                                                                                                                                                          |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope of this PR | **Style presets only.** Content templates deferred.                                                                                                             |
| Style model      | Two enums: `preset ∈ {modern, classic, compact, executive}`, `accent ∈ {slate, navy, black, burgundy, forest}`.                                                 |
| Renderer         | Keep pandoc; feed a styled `--reference-doc` built with python-docx, `@lru_cache` per combo.                                                                    |
| `NULL` semantics | No saved style → no reference doc → byte-identical to today; existing cache stays valid. No forced re-render.                                                   |
| Migration        | Two nullable JSONB columns (`user_profiles.resume_style_settings`, `documents.style_settings`). **Applied to the linked Supabase project**, not just committed. |
| API              | `GET`/`PATCH /profile/resume-style`, mirroring `/profile/notifications`. `TailorRequest` unchanged.                                                             |
| Branch / base    | `feat/wyrdfold-resume-style-presets` off `origin/develop` (markdown editor already merged there). PR targets `develop`.                                         |

## Explicitly deferred

- Per-record style override UI (the `documents.style_settings` column ships now; the PATCH endpoint + review-page disclosure come later).
- The content-template axis in its entirety.
- Free-hex accents / additional presets.
