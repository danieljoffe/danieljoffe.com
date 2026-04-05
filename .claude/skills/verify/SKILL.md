---
name: verify
description: Run full verification loop — build, dev server + browser hydration check, and pom scripts individually
user-invocable: true
---

# Verify

Run the full verification loop after significant changes. Fix any issues that arise at each step before proceeding to the next.

## Instructions

### Phase 1: Production Build

Run `yarn nx build root --prod`. Fix any build errors (missing imports, type errors, prerender failures) before continuing.

### Phase 2: Dev Server + Browser Hydration Check

1. Start the dev server: `yarn nx dev root` (background)
2. Wait for it to be ready, then open a browser using Chrome DevTools MCP
3. Visit these pages and check console for errors/warnings (ignore Calendly 403s, Storybook iframe errors, and "unable to connect to top frame" warnings — these are pre-existing):
   - `/` (homepage)
   - `/about`
   - `/services`
   - `/projects`
   - `/experience`
   - `/blog`
   - `/audit`
   - One detail page from each content type (e.g. `/experience/winc`, `/projects/ui-components-v2`, `/blog/unified-content-pipeline`)
4. If any hydration errors or unexpected errors appear, fix them
5. Stop the dev server when done

### Phase 3: POM Scripts (individually)

Run each script from `yarn pom` one at a time in this order. Fix failures before proceeding:

1. `yarn typecheck`
2. `yarn lint:fix`
3. `yarn format`
4. `yarn test`
5. `yarn test:coverage`
6. `yarn test:e2e`
7. `yarn test:lighthouse`

### Phase 4: Report

After all steps pass, report a summary table:

| Step            | Result |
| --------------- | ------ |
| Build           | ...    |
| Hydration check | ...    |
| typecheck       | ...    |
| lint:fix        | ...    |
| format          | ...    |
| test            | ...    |
| test:coverage   | ...    |
| test:e2e        | ...    |
| test:lighthouse | ...    |

Note any pre-existing warnings (not introduced by current changes) separately.

If any fixes were made during verification, commit them before reporting.
