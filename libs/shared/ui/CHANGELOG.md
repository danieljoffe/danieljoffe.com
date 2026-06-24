# @danieljoffe/shared-ui

## 0.4.0

### Minor Changes

- 9a3d9f2: Accessibility: section labels are now real headings. `SectionLabel` renders its
  label as a semantic heading (`<h2>` by default, with an optional `as="h3"` for
  nested sections) instead of a styled `<span>`, so screen-reader heading
  navigation works. Adds a `sectionLabel` `Heading` variant (the eyebrow-label
  look, defaults to `h2`), and `Heading`'s `as` prop now accepts an explicit
  `undefined` (for `exactOptionalPropertyTypes` callers that forward it).
- e135ec5: PageLayout is now a full-width `<main>` landmark that owns no max-width and no page padding — it contributes only the vertical rhythm _between_ sections (`gap-y`). The `wide` prop is removed. It also sets `scroll-mt` on the landmark so the App Router's post-navigation focus of `#main-content` doesn't scroll a static header off-screen.

  Each `Section` now owns its own spacing and containment:
  - `contain` defaults to `'sm'` (the section constrains its own content); pass a larger size for wide layouts, or `'none'` for a full-bleed section.
  - `padding='none'` now emits **no** padding utility (instead of `py-0`), so a caller's `className` can set its own vertical padding without losing to `py-0` in the cascade — e.g. a first section setting `pt-*` for leading whitespace.

  Migration: sections that relied on `<PageLayout wide>` should set `contain='lg'`; a page's first section should set its own top padding (the shell no longer adds one), and the footer/last section owns the trailing whitespace.

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
