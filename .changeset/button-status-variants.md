---
'@danieljoffe/shared-ui': minor
---

Add solid status variants to Button, make filled labels bold, and tighten the default height.

- **Status variants** — `error`, `warning`, `success`, and `info` are now valid `Button` variants: deep, solid, high-emphasis fills with white text, for definitive, attention-demanding actions. They reuse the shared `SemanticVariant` scale. There are intentionally no low-emphasis semantic combos — intent only rides the definitive variants, so a quiet "danger" button (a whispered alarm) isn't representable. New mode-independent `--color-{error,warning,success,info}-solid` fill tokens paired with a white `--color-on-semantic` foreground mean every status button clears WCAG AA in both the indigo and pyre themes, light and dark.
- **Bold labels** — filled variants (everything except `bare`) now render `font-bold`, so button text carries more weight and is easier to distinguish. `bare` stays weightless, so consumers that build on it (e.g. nav items) keep full control.
- **Shorter default** — the `md` size drops from `py-3` to `py-2` for a less bulky default height (`sm` and `lg` unchanged).

Adds the `--color-on-semantic` and `--color-*-solid` theme tokens. No breaking changes.
