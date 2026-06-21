---
'@danieljoffe/shared-ui': minor
---

PageLayout is now a full-width `<main>` landmark that owns no max-width and no page padding — it contributes only the vertical rhythm _between_ sections (`gap-y`). The `wide` prop is removed. It also sets `scroll-mt` on the landmark so the App Router's post-navigation focus of `#main-content` doesn't scroll a static header off-screen.

Each `Section` now owns its own spacing and containment:

- `contain` defaults to `'sm'` (the section constrains its own content); pass a larger size for wide layouts, or `'none'` for a full-bleed section.
- `padding='none'` now emits **no** padding utility (instead of `py-0`), so a caller's `className` can set its own vertical padding without losing to `py-0` in the cascade — e.g. a first section setting `pt-*` for leading whitespace.

Migration: sections that relied on `<PageLayout wide>` should set `contain='lg'`; a page's first section should set its own top padding (the shell no longer adds one), and the footer/last section owns the trailing whitespace.
