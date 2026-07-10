---
'@danieljoffe/shared-ui': minor
---

Table: controlled sortable columns + `ref`/rest-spread, and a focus-ring bug fix.

- **Sortable columns** — mark a `Column` as `sortable` and pass `sortKey` / `sortDirection` / `onSort`. Sortable headers become keyboard-operable buttons with a direction indicator, and each `<th>` exposes the correct `aria-sort` (`ascending` / `descending` / `none`). Sorting is **controlled**: the Table renders the state and header control, while the consumer owns the order and re-sorts `data` in response to `onSort`.
- **Escape hatch** — Table now accepts a `ref` on its wrapper element and spreads rest props onto it.
- **Fix** — the clickable-row focus outline used `outline-accent`, but `--color-accent` is not defined in any theme (so the outline rendered with no color); switched to the defined `outline-brand-500`.
