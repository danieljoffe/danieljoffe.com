---
'@danieljoffe/shared-ui': patch
---

Add adoption-focused documentation and correct drift between the docs and the code.

- New **Guides** in the Storybook catalog: _Extend, Don't Reimplement_ (the use → extend → compose → rebuild decision tree, plus the kit-vs-app boundary), _Reach for a Primitive_ (a raw-HTML → component cheat-sheet), and _Accessibility_ (per-component guarantees and the edges you still own).
- Documented the linked-development workflow in the README — the `@danieljoffe.com/source` export condition lets a consumer import the library's source directly and iterate without a publish cycle.
- Fixed documentation that described a different component than the one shipped: Button variants (`bare`/`primary`/`secondary`/`outline` — the previously-listed `ghost`/`danger`/semantic variants are not real and rendered unstyled), Table (no built-in sorting), Sidebar (`activeId`, not `activeItem`), ThemeToggle (light/dark/system), and PageLayout/PageContainer props.
- Extracted the Storybook guide-page styles that were duplicated across every component MDX into a single stylesheet, and pointed the README component catalog at the Storybook autodocs as the authoritative prop reference.

No runtime or public API changes.
