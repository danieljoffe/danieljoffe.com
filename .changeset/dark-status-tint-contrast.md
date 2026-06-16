---
'@danieljoffe/shared-ui': patch
---

Dark-mode `warning`/`error` status tints (Badge, Alert, Toast) are less muddy
and lift the error text off the WCAG AA floor. `--color-error-light` moves to
`oklch(0.21 0.055 25)` (text-on-tint contrast 4.53 → 5.00) and
`--color-warning-light` to `oklch(0.3 0.055 72)`; both keep their hue but drop
chroma to read as cleaner tinted surfaces. Also re-syncs the Storybook preview
tokens, which had drifted from the published theme.
