---
name: verify
description: Verify the root Next.js app — build, browser console check, and quality gate
user-invocable: true
disable-model-invocation: true
---

# Verify

Verify the root Next.js application passes build, renders correctly, and meets quality gates. **Do not fix failures** — report them and stop.

## Token Budget Rules

- Route ALL commands producing >20 lines through `ctx_batch_execute` or `ctx_execute`
- Batch independent commands into a single `ctx_batch_execute` call
- If any phase fails, report the failure in the summary table and **stop** — do not attempt fixes
- Browser checks: 4 representative pages only

## Instructions

### Phase 1: Production Build

Run via `ctx_execute`:

```
ctx_execute(language: "shell", code: "NX_SOCKET_DIR=/tmp/nx-tmp pnpm nx build root")
```

If the build fails, report and stop.

### Phase 2: Dev Server + Browser Console Check

1. Start the dev server: `pnpm nx dev root` (background)
2. Wait for it to be ready, then open a browser using Chrome DevTools MCP
3. Visit these representative pages and check console for errors (ignore Calendly 403s, Storybook iframe errors, "unable to connect to top frame"):
   - `/` (homepage)
   - `/about`
   - `/blog`
   - `/audit`
4. If unexpected console errors appear, note them in the report
5. Stop the dev server when done

### Phase 3: Test Suite

Run via `ctx_batch_execute`:

```
[
  { "label": "typecheck",  "command": "NX_SOCKET_DIR=/tmp/nx-tmp pnpm typecheck" },
  { "label": "lint",       "command": "NX_SOCKET_DIR=/tmp/nx-tmp pnpm lint:fix" },
  { "label": "format",     "command": "NX_SOCKET_DIR=/tmp/nx-tmp pnpm format" },
  { "label": "test",       "command": "NX_SOCKET_DIR=/tmp/nx-tmp pnpm test" },
  { "label": "coverage",   "command": "NX_SOCKET_DIR=/tmp/nx-tmp pnpm test:coverage" },
  { "label": "e2e",        "command": "NX_SOCKET_DIR=/tmp/nx-tmp pnpm test:e2e" },
  { "label": "lighthouse", "command": "NX_SOCKET_DIR=/tmp/nx-tmp pnpm test:lighthouse" }
]
```

Search results for failures: `ctx_search(["error", "failed", "FAILED"])`.

### Phase 4: Report

Report a summary table:

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
