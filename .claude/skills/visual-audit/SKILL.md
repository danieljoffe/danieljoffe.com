---
name: visual-audit
description: Run a visual/UX review of a page on localhost:3000
disable-model-invocation: true
argument-hint: '<page path, e.g. /, /about, /projects, /services>'
---

# Visual Audit

Run a stylistic review of the requested page.

## Instructions

1. The host should be at `http://localhost:3000`
2. Run a hard refresh on the browser to avoid cache
3. Navigate to `http://localhost:3000{page}` where `{page}` is the argument provided
4. Take a screenshot of the full page
5. Provide actionable feedback on:
   - Style consistency (colors, spacing, typography)
   - UX/UI implementation quality
   - Responsive design concerns (if visible)
   - Visual hierarchy and readability
   - Animation/transition polish
   - Accessibility visual indicators (focus states, contrast)
6. Bring up any questions if you have any

## Responsive Breakpoints

After the desktop screenshot, resize the viewport and screenshot at these breakpoints:

- **Mobile**: 375x812 (iPhone SE)
- **Tablet**: 768x1024 (iPad)
- **Desktop**: 1440x900 (default)

Compare layouts across breakpoints for spacing, overflow, and readability issues.

## Tools to Use

Use the Playwright or Chrome DevTools MCP servers to navigate and screenshot the page.
