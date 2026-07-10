---
'@danieljoffe/shared-ui': minor
---

Add `ref` + rest-prop escape hatches to Sidebar, ThemeToggle, Avatar, and Breadcrumb.

Each now accepts a React 19 `ref` on its root element and spreads unrecognized props (`data-*`, `id`, `style`, event handlers, etc.) onto it — matching the pattern already used by Button/Badge — so consumers can extend them without forking. ThemeToggle additionally gains a `className` prop.
