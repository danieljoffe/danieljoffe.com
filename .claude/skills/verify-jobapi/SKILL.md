---
name: verify-jobapi
description: Verify the job-api backend and its Fitted frontend workflows
user-invocable: true
disable-model-invocation: true
---

# Verify Job API

Verify the job-api backend and Fitted frontend integration pass all checks. **Do not fix failures** — report them and stop.

## Token Budget Rules

- Route ALL commands producing >20 lines through `ctx_batch_execute` or `ctx_execute`
- Batch independent commands into a single `ctx_batch_execute` call
- If any phase fails, report the failure in the summary table and **stop** — do not attempt fixes
- Browser checks: 2 representative pages only

## Instructions

### Phase 1: Backend + TypeScript Checks

Run via `ctx_batch_execute` (one call):

```
[
  { "label": "lint-jobapi",  "command": "pnpm nx lint job-api" },
  { "label": "mypy-jobapi",  "command": "pnpm nx mypy job-api" },
  { "label": "test-jobapi",  "command": "pnpm nx test job-api" },
  { "label": "typecheck",    "command": "pnpm tsc --noEmit" }
]
```

Search results for failures: `ctx_search(["error", "failed", "FAILED"])`. If any command failed, report and stop.

### Phase 2: Frontend Unit Tests

Run the subset of root app tests covering the job-api integration:

```
ctx_execute(language: "shell", code: "pnpm nx test root -- --testPathPatterns='(api/(jobs|career|targets)|fitted)'")
```

If tests fail, report and stop.

### Phase 3: Authenticated Browser Check

1. Read `TOOLS_ADMIN_PASSWORD` from `apps/root/.env.local` using Grep
2. Start the dev server: `pnpm nx dev root` (background)
3. Wait for it to be ready, then open a browser using Chrome DevTools MCP
4. Navigate to `http://localhost:3000`
5. Authenticate via Chrome DevTools `evaluate_script`:
   ```js
   await fetch('/api/tools/login', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ password: '<TOOLS_ADMIN_PASSWORD value>' }),
   });
   ```
6. Verify response status is 200
7. Visit these pages and check console for errors:
   - `/fitted` (dashboard)
   - `/fitted/jobs` (job listings)
8. Note any unexpected console errors
9. Stop the dev server when done

### Phase 4: Report

| Step                     | Result |
| ------------------------ | ------ |
| lint (job-api)           | ...    |
| mypy (job-api)           | ...    |
| test (job-api)           | ...    |
| typecheck                | ...    |
| test (root — job routes) | ...    |
| console (Fitted)         | ...    |

Note pre-existing warnings separately. **Do not commit fixes.**
