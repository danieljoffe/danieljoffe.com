---
'@danieljoffe/shared-ui': patch
---

Accessibility fixes for Pagination and Skeleton.

- **Pagination** — remove the redundant `aria-disabled` on the prev/next buttons. They already use native `disabled`, and per ARIA `aria-disabled` is only for elements that lack a native disabled state.
- **Skeleton** — mark the decorative loading placeholder `aria-hidden="true"` so screen readers skip it (the loading state should be conveyed by an `aria-busy` container instead).
