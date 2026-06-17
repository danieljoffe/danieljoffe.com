# @danieljoffe/shared-ui

## 0.3.0

### Minor Changes

- 4636083: Dropdown items can now be rendered as links via an optional `href`, with
  `external` opening the link in a new tab (`target="_blank"` + `rel="noopener
noreferrer"`) and showing a trailing external-link icon. Keyboard activation
  (Enter/Space) follows the link.

### Patch Changes

- cdb9b0c: Dark-mode `warning`/`error` status tints (Badge, Alert, Toast) are less muddy
  and lift the error text off the WCAG AA floor. `--color-error-light` moves to
  `oklch(0.21 0.055 25)` (text-on-tint contrast 4.53 → 5.00) and
  `--color-warning-light` to `oklch(0.3 0.055 72)`; both keep their hue but drop
  chroma to read as cleaner tinted surfaces. Also re-syncs the Storybook preview
  tokens, which had drifted from the published theme.
