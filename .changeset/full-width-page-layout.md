---
'@danieljoffe/shared-ui': minor
---

PageLayout is now a full-width `<main>` landmark that provides vertical rhythm only — it no longer wraps content in a max-width container, and the `wide` prop is removed.

Each `Section` now constrains its own content instead: `contain` defaults to `'sm'`, and a new `contain='none'` opts out for full-bleed sections (e.g. a hero with an edge-to-edge backdrop or a full-width background band).

Migration: sections that previously relied on `<PageLayout wide>` should set `contain='lg'`; full-bleed sections should set `contain='none'` and wrap their own content in a `Container`.
