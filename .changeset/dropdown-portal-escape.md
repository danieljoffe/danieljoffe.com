---
'@danieljoffe/shared-ui': minor
---

Dropdown menus now render in a document.body portal with a fixed-position
anchor computed from the trigger, so overflow-hidden/auto ancestors (modal
edges, scroll containers) can no longer clip them. Alignment is exposed as
`data-align` instead of `left-0`/`right-0` classes; the anchor re-computes on
scroll and resize. Outside-click and Escape dismissal now treat the portaled
panel as "inside" via a new `panelRef` returned from `useAnchoredPanel`
(inline panels like Popover are unaffected). Found as wyrdfold ux-sweep
2026-08-12 B2: a target-picker Dropdown inside a modal was cut off at the
modal edge until scrolled.
