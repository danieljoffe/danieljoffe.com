---
'@danieljoffe/shared-ui': minor
---

Modal sheet polish + escape hatches for adopting hand-rolled sheets:

- `placement='sheet'` now travels the full height: a true slide-up entrance (`sheet-in`, replacing the subtle 8px `slide-up` pop) and a slide-out exit before unmounting (`sheet-out`, Toast's dismissing pattern — the sheet is inert and the backdrop is gone during the exit; centered dialogs still close instantly). Consuming themes need the new `--animate-sheet-in` / `--animate-sheet-out` tokens + keyframes (in `indigo-theme.css`).
- New props: `aria-label` (dialog name when there is no `title`), `showCloseButton` (default `true` — hide the built-in X when content supplies its own), `bodyClassName` (override body padding / add safe-area insets).
