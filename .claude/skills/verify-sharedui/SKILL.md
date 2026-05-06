---
name: verify-sharedui
description: Verify the shared-ui library — build, unit tests, Storybook, and consumer smoke test
user-invocable: true
disable-model-invocation: true
---

# Verify Shared UI

Verify the shared-ui component library passes all checks. **Do not fix failures** — report them and stop.

## Token Budget Rules

- Route ALL commands producing >20 lines through `ctx_batch_execute` or `ctx_execute`
- Batch independent commands into a single `ctx_batch_execute` call
- If any phase fails, report the failure in the summary table and **stop** — do not attempt fixes
- No visual browser checks — interaction tests cover rendering

## Instructions

### Phase 1: Static Checks + Unit Tests

Run via `ctx_batch_execute` (one call):

```
[
  { "label": "lint",      "command": "pnpm nx lint @danieljoffe.com/shared-ui" },
  { "label": "typecheck", "command": "pnpm nx typecheck @danieljoffe.com/shared-ui" },
  { "label": "test",      "command": "pnpm nx test @danieljoffe.com/shared-ui" }
]
```

Search results for failures: `ctx_search(["error", "failed", "FAILED"])`. If any command failed, report and stop.

### Phase 2: Storybook Build + Interaction Tests

Run via `ctx_batch_execute`:

```
[
  { "label": "build-storybook", "command": "pnpm nx build-storybook @danieljoffe.com/shared-ui" },
  { "label": "test-storybook",  "command": "pnpm nx test-storybook @danieljoffe.com/shared-ui" }
]
```

Note: `test-storybook` runs Vitest + Playwright in headless browser, executing `play` functions from stories. This covers both interaction logic and rendering — no separate visual browser check needed.

If build-storybook fails, report and stop (test-storybook depends on it).

### Phase 3: Consumer Smoke Test

Verify the root app (primary consumer) still builds:

```
ctx_execute(language: "shell", code: "pnpm nx build root")
```

This catches breaking export changes, missing components, or type mismatches at the integration boundary.

### Phase 4: Report

| Step                  | Result |
| --------------------- | ------ |
| lint (shared-ui)      | ...    |
| typecheck (shared-ui) | ...    |
| test (shared-ui)      | ...    |
| build-storybook       | ...    |
| test-storybook        | ...    |
| consumer build (root) | ...    |

Note pre-existing warnings separately. **Do not commit fixes.**
