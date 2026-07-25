---
'@danieljoffe/shared-ui': minor
---

Composable triggers for Popover and Dropdown: pass a render function as `trigger` to supply your own trigger element (e.g. the design-system `Button`) — the primitive injects `ref`, `id`, `type`, `aria-*`, and handlers (`PopoverTriggerProps` / `DropdownTriggerProps`), and keeps owning open state, dismiss, keyboard nav, and focus return. The node form of `trigger` is unchanged.

Dropdown parity with Popover: controlled `open`/`onOpenChange` and `panelClassName`; its outside-click listener now attaches only while the menu is open.
