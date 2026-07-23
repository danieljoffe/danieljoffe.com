---
'@danieljoffe/shared-ui': minor
---

Button: add a `strong` variant, and make every variant render at the same size.

- **`strong` variant** — the highest-emphasis brand action: a solid brand fill with white text, one step above `primary`. On the Pyre theme its fill is a purpose-built darkened chartreuse (`--color-brand-strong`) chosen so white text clears WCAG AA — the signature bright chartreuse is too light for white (2.76:1). White on `brand-strong` is ~5.1:1 on Pyre and ~6:1 on Indigo. Backed by new `--color-brand-strong` / `--color-on-brand-strong` tokens in both themes.
- **Uniform sizing** — a 1px border grows an auto-height button, so the bordered variants (`secondary`/`outline`) rendered ~2px larger than the borderless fills (`primary`/`strong`/status). Every non-`bare` variant now reserves an identical 1px border box (`border-transparent` on the fills), so variant no longer changes a button's footprint. This grows `primary` and the status variants by ~1px per side to match; `secondary`/`outline`/`bare` are unchanged.
