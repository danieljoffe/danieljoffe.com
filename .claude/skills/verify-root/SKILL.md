---
name: verify-root
description: Verify the root Next.js app — build, browser console check, and quality gate
user-invocable: true
disable-model-invocation: true
---

# Verify Root

Verify the root Next.js application (portfolio/public site) passes build, renders correctly, and meets quality gates. **Do not fix failures** — report them and stop.

## Token Budget Rules

- Route ALL commands producing >20 lines through `ctx_batch_execute` or `ctx_execute`
- Batch independent commands into a single `ctx_batch_execute` call
- If any phase fails, report the failure in the summary table and **stop** — do not attempt fixes
- Keep browser checks to representative pages only

## Instructions

### Phase 1: Build + Static Checks

Run via `ctx_batch_execute` (all three in one call):

```
[
  { "label": "build",     "command": "pnpm nx build root" },
  { "label": "typecheck", "command": "pnpm tsc --noEmit" },
  { "label": "lint",      "command": "pnpm lint:fix" }
]
```

Search results for failures: `ctx_search(["error", "failed"])`. If any command failed, report and stop.

### Phase 2: Browser Console Check

1. Start the dev server: `pnpm nx dev root` (background)
2. Wait for it to be ready, then open a browser using Chrome DevTools MCP
3. Visit these representative pages and check console for errors (ignore Calendly 403s, Storybook iframe errors, "unable to connect to top frame"):
   - `/` (homepage)
   - `/about`
   - `/blog`
   - `/projects`
4. If unexpected console errors appear, note them in the report
5. Stop the dev server when done

### Phase 3: Test Suite

Run via `ctx_batch_execute`:

```
[
  { "label": "unit-tests",  "command": "pnpm test" },
  { "label": "coverage",    "command": "pnpm test:coverage" }
]
```

Search for failures. If tests fail, report and stop.

### Phase 4: E2E + Lighthouse (optional)

These are slow and often have pre-existing flaky failures. Run only if Phases 1-3 pass cleanly:

```
[
  { "label": "e2e",        "command": "pnpm test:e2e" },
  { "label": "lighthouse", "command": "pnpm test:lighthouse" }
]
```

### Phase 5: Report

Report a summary table with pass/fail for each step:

| Step       | Result |
| ---------- | ------ |
| build      | ...    |
| typecheck  | ...    |
| lint       | ...    |
| console    | ...    |
| test       | ...    |
| coverage   | ...    |
| e2e        | ...    |
| lighthouse | ...    |

Note any pre-existing warnings (not introduced by current changes) separately.

**Do not commit fixes.** If failures need fixing, report them so the user can address them.
