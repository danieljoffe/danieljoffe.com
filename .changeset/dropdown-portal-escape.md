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

Two notes for consumers. The menu mounts after hydration rather than during
render, because `react-dom/server` supports neither portals nor `document` —
uncontrolled dropdowns start closed and never notice, but a Dropdown given
`open` from the first paint now renders its menu on mount instead of crashing
the server render. And a modal that dismisses on outside-click via DOM
containment must now count the portaled menu as inside, since it is no longer
a descendant of the trigger.
