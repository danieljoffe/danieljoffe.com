---
name: verify-sharedui
description: Verify the shared-ui library — build, unit tests, Storybook, and consumer smoke test
user-invocable: true
---

# Verify Shared UI

Run targeted verification for the shared-ui component library. Fix any issues at each step before proceeding.

## Instructions

### Phase 1: Lint + Typecheck

Run these sequentially, fixing failures before proceeding:

1. `pnpm nx lint @danieljoffe.com/shared-ui`
2. `pnpm nx typecheck @danieljoffe.com/shared-ui`

### Phase 2: Unit Tests (Jest)

Run `pnpm nx test @danieljoffe.com/shared-ui`. These are the Jest-based spec files in `libs/shared/ui/src/`.

### Phase 3: Storybook Build + Interaction Tests

1. Build Storybook: `pnpm nx build-storybook @danieljoffe.com/shared-ui`
   - Fix any build errors before continuing
2. Run Storybook interaction tests (Vitest + Playwright): `pnpm nx test-storybook @danieljoffe.com/shared-ui`
   - These run `play` functions from stories in a headless browser

### Phase 4: Visual Storybook Check

1. Start Storybook: `pnpm nx storybook @danieljoffe.com/shared-ui` (background)
2. Wait for it to be ready, then open a browser using Chrome DevTools MCP
3. Navigate to Storybook (typically `http://localhost:6006`)
4. Spot-check a few component stories for rendering issues:
   - A layout component (e.g., Grid, Stack, Container)
   - A form component (e.g., Input, Select, Checkbox)
   - A feedback component (e.g., Alert, Toast, Modal)
5. Check console for errors/warnings
6. Stop Storybook when done

### Phase 5: Consumer Smoke Test

Verify the root app (primary consumer) still builds with the shared-ui changes:

```bash
pnpm nx build root
```

This catches breaking export changes, missing components, or type mismatches at the integration boundary.

### Phase 6: Report

After all steps pass, report a summary table:

| Step                  | Result |
| --------------------- | ------ |
| lint (shared-ui)      | ...    |
| typecheck (shared-ui) | ...    |
| test (shared-ui)      | ...    |
| build-storybook       | ...    |
| test-storybook        | ...    |
| visual check          | ...    |
| consumer build (root) | ...    |

Note any pre-existing warnings separately.

If any fixes were made during verification, commit them before reporting.
