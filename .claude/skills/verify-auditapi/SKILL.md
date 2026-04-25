---
name: verify-auditapi
description: Verify the audit-api backend and its audit tool frontend workflows
user-invocable: true
disable-model-invocation: true
---

# Verify Audit API

Verify the audit-api backend and audit tool frontend pass all checks. **Do not fix failures** — report them and stop.

## Token Budget Rules

- Route ALL commands producing >20 lines through `ctx_batch_execute` or `ctx_execute`
- Batch independent commands into a single `ctx_batch_execute` call
- If any phase fails, report the failure in the summary table and **stop** — do not attempt fixes
- Browser checks: 2 public pages + 1 admin page

## Instructions

### Phase 1: Backend + TypeScript Checks

Run via `ctx_batch_execute` (one call):

```
[
  { "label": "lint-auditapi",     "command": "pnpm nx lint audit-api" },
  { "label": "typecheck-auditapi","command": "pnpm nx typecheck audit-api" },
  { "label": "test-auditapi",     "command": "pnpm nx test audit-api" },
  { "label": "typecheck-tsc",     "command": "pnpm tsc --noEmit" }
]
```

Search results for failures: `ctx_search(["error", "failed", "FAILED"])`. If any command failed, report and stop.

### Phase 2: Frontend Unit Tests

Run the subset of root app tests covering the audit integration:

```
ctx_execute(language: "shell", code: "pnpm nx test root -- --testPathPatterns='(api/audit|audit)'")
```

If tests fail, report and stop.

### Phase 3: Browser Check

1. Read `TOOLS_ADMIN_PASSWORD` from `apps/root/.env.local` using Grep
2. Start the dev server: `pnpm nx dev root` (background)
3. Wait for it to be ready, then open a browser using Chrome DevTools MCP

**Public pages (no auth needed):**

4. Visit `/audit` and `/audit/insights`, check console for errors

**Admin page (auth needed):**

5. Authenticate via Chrome DevTools `evaluate_script`:
   ```js
   await fetch('/api/tools/login', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ password: '<TOOLS_ADMIN_PASSWORD value>' }),
   });
   ```
6. Visit `/tools/admin/audit`, check console for errors
7. Stop the dev server when done

### Phase 4: Report

| Step                       | Result |
| -------------------------- | ------ |
| lint (audit-api)           | ...    |
| typecheck (audit-api)      | ...    |
| test (audit-api)           | ...    |
| typecheck (tsc)            | ...    |
| test (root — audit routes) | ...    |
| console (public)           | ...    |
| console (admin)            | ...    |

Note pre-existing warnings separately. **Do not commit fixes.**
