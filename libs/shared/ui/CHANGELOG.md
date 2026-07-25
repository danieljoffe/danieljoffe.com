# @danieljoffe/shared-ui

## 0.10.0

### Minor Changes

- f36a2af: Composable triggers for Popover and Dropdown: pass a render function as `trigger` to supply your own trigger element (e.g. the design-system `Button`) — the primitive injects `ref`, `id`, `type`, `aria-*`, and handlers (`PopoverTriggerProps` / `DropdownTriggerProps`), and keeps owning open state, dismiss, keyboard nav, and focus return. The node form of `trigger` is unchanged.

  Dropdown parity with Popover: controlled `open`/`onOpenChange` and `panelClassName`; its outside-click listener now attaches only while the menu is open.

## 0.9.0

### Minor Changes

- b39c904: Component support to eliminate hand-rolled UI in consumer apps (#1103):
  - **New `Popover`**: anchored non-modal panel on a trigger — outside-click + Escape dismissal, focus into panel on open and back to trigger on close, `aria-haspopup='dialog'` wiring, render-prop `close`, optional controlled `open`/`onOpenChange`.
  - **New `Accordion`**: WAI-ARIA accordion — `aria-expanded` header buttons in headings, labelled regions, arrow-key navigation, `allowMultiple` or single-open.
  - **`Dropdown`**: per-item `loading` (spinner + `aria-busy`, non-actionable), `content` custom body slot (with `label` as accessible name), and `closeOnClick: false` to keep the menu open for async pickers.
  - **`Avatar`**: `tileClassName` to override the initials tile's colors (deterministic per-entity hues) and `shape='square'`.
  - **`ProgressBar`**: `warning` variant for approaching-limit meters.
  - **`Modal`**: `placement='sheet'` bottom-sheet variant (bottom-anchored, rounded top, slide-up) keeping the existing focus trap/scroll lock.
  - **`Checkbox`**: documented the clickable-row `stopPropagation` wrapper pattern.

## 0.8.0

### Minor Changes

- f393e7b: Button: `primary` is now a solid brand fill with **white text in every theme**, and the `strong` variant is removed.

  Every filled Button is now white-on-color, so `primary` is no longer the odd one out. On the **Pyre** theme `primary` renders white on a darkened chartreuse (`brand-strong`, ≈5:1) instead of near-black on the bright chartreuse — the bright signature chartreuse is too light to carry white at WCAG AA. On **Indigo** `primary` is unchanged (its `brand-strong` equals `brand-500`).

  **Breaking:** the `strong` variant (added in 0.7.0) is removed — its white-on-green treatment is now the default `primary`. Replace any `variant="strong"` with `variant="primary"`.

## 0.7.0

### Minor Changes

- 3bb8915: Button: add a `strong` variant, and make every variant render at the same size.
  - **`strong` variant** — the highest-emphasis brand action: a solid brand fill with white text, one step above `primary`. On the Pyre theme its fill is a purpose-built darkened chartreuse (`--color-brand-strong`) chosen so white text clears WCAG AA — the signature bright chartreuse is too light for white (2.76:1). White on `brand-strong` is ~5.1:1 on Pyre and ~6:1 on Indigo. Backed by new `--color-brand-strong` / `--color-on-brand-strong` tokens in both themes.
  - **Uniform sizing** — a 1px border grows an auto-height button, so the bordered variants (`secondary`/`outline`) rendered ~2px larger than the borderless fills (`primary`/`strong`/status). Every non-`bare` variant now reserves an identical 1px border box (`border-transparent` on the fills), so variant no longer changes a button's footprint. This grows `primary` and the status variants by ~1px per side to match; `secondary`/`outline`/`bare` are unchanged.

## 0.6.0

### Minor Changes

- 14853e6: Add `ref` + rest-prop escape hatches to Sidebar, ThemeToggle, Avatar, and Breadcrumb.

  Each now accepts a React 19 `ref` on its root element and spreads unrecognized props (`data-*`, `id`, `style`, event handlers, etc.) onto it — matching the pattern already used by Button/Badge — so consumers can extend them without forking. ThemeToggle additionally gains a `className` prop.

- dcb37ed: Table: controlled sortable columns + `ref`/rest-spread, and a focus-ring bug fix.
  - **Sortable columns** — mark a `Column` as `sortable` and pass `sortKey` / `sortDirection` / `onSort`. Sortable headers become keyboard-operable buttons with a direction indicator, and each `<th>` exposes the correct `aria-sort` (`ascending` / `descending` / `none`). Sorting is **controlled**: the Table renders the state and header control, while the consumer owns the order and re-sorts `data` in response to `onSort`.
  - **Escape hatch** — Table now accepts a `ref` on its wrapper element and spreads rest props onto it.
  - **Fix** — the clickable-row focus outline used `outline-accent`, but `--color-accent` is not defined in any theme (so the outline rendered with no color); switched to the defined `outline-brand-500`.

### Patch Changes

- 2c8d13e: Accessibility fixes for Pagination and Skeleton.
  - **Pagination** — remove the redundant `aria-disabled` on the prev/next buttons. They already use native `disabled`, and per ARIA `aria-disabled` is only for elements that lack a native disabled state.
  - **Skeleton** — mark the decorative loading placeholder `aria-hidden="true"` so screen readers skip it (the loading state should be conveyed by an `aria-busy` container instead).

## 0.5.0

### Minor Changes

- 430a9e4: Add solid status variants to Button, make filled labels bold, and tighten the default height.
  - **Status variants** — `error`, `warning`, `success`, and `info` are now valid `Button` variants: deep, solid, high-emphasis fills with white text, for definitive, attention-demanding actions. They reuse the shared `SemanticVariant` scale. There are intentionally no low-emphasis semantic combos — intent only rides the definitive variants, so a quiet "danger" button (a whispered alarm) isn't representable. New mode-independent `--color-{error,warning,success,info}-solid` fill tokens paired with a white `--color-on-semantic` foreground mean every status button clears WCAG AA in both the indigo and pyre themes, light and dark.
  - **Bold labels** — filled variants (everything except `bare`) now render `font-bold`, so button text carries more weight and is easier to distinguish. `bare` stays weightless, so consumers that build on it (e.g. nav items) keep full control.
  - **Shorter default** — the `md` size drops from `py-3` to `py-2` for a less bulky default height (`sm` and `lg` unchanged).

  Adds the `--color-on-semantic` and `--color-*-solid` theme tokens. No breaking changes.

### Patch Changes

- 6662088: Add adoption-focused documentation and correct drift between the docs and the code.
  - New **Guides** in the Storybook catalog: _Extend, Don't Reimplement_ (the use → extend → compose → rebuild decision tree, plus the kit-vs-app boundary), _Reach for a Primitive_ (a raw-HTML → component cheat-sheet), and _Accessibility_ (per-component guarantees and the edges you still own).
  - Documented the linked-development workflow in the README — the `@danieljoffe.com/source` export condition lets a consumer import the library's source directly and iterate without a publish cycle.
  - Fixed documentation that described a different component than the one shipped: Button variants (`bare`/`primary`/`secondary`/`outline` — the previously-listed `ghost`/`danger`/semantic variants are not real and rendered unstyled), Table (no built-in sorting), Sidebar (`activeId`, not `activeItem`), ThemeToggle (light/dark/system), and PageLayout/PageContainer props.
  - Extracted the Storybook guide-page styles that were duplicated across every component MDX into a single stylesheet, and pointed the README component catalog at the Storybook autodocs as the authoritative prop reference.

  No runtime or public API changes.

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
