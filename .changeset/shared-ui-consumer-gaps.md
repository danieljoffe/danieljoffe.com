---
'@danieljoffe/shared-ui': minor
---

Component support to eliminate hand-rolled UI in consumer apps (#1103):

- **New `Popover`**: anchored non-modal panel on a trigger — outside-click + Escape dismissal, focus into panel on open and back to trigger on close, `aria-haspopup='dialog'` wiring, render-prop `close`, optional controlled `open`/`onOpenChange`.
- **New `Accordion`**: WAI-ARIA accordion — `aria-expanded` header buttons in headings, labelled regions, arrow-key navigation, `allowMultiple` or single-open.
- **`Dropdown`**: per-item `loading` (spinner + `aria-busy`, non-actionable), `content` custom body slot (with `label` as accessible name), and `closeOnClick: false` to keep the menu open for async pickers.
- **`Avatar`**: `tileClassName` to override the initials tile's colors (deterministic per-entity hues) and `shape='square'`.
- **`ProgressBar`**: `warning` variant for approaching-limit meters.
- **`Modal`**: `placement='sheet'` bottom-sheet variant (bottom-anchored, rounded top, slide-up) keeping the existing focus trap/scroll lock.
- **`Checkbox`**: documented the clickable-row `stopPropagation` wrapper pattern.
