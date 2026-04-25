---
name: verify-auditapi
description: Verify the audit-api backend and its audit tool frontend workflows
user-invocable: true
---

# Verify Audit API

Run targeted verification for the audit-api backend and its audit tool frontend integration. Fix any issues at each step before proceeding.

## Instructions

### Phase 1: Backend Checks

Run these sequentially, fixing failures before proceeding:

1. `pnpm nx lint audit-api`
2. `pnpm nx typecheck audit-api` (mypy)
3. `pnpm nx test audit-api`

### Phase 2: TypeScript Typecheck

Run `pnpm tsc --noEmit`. This catches type errors in the Next.js API routes and frontend components that integrate with audit-api.

### Phase 3: Frontend Unit Tests (API route + component subset)

Run the subset of root app tests that cover the audit integration layer:

```bash
pnpm nx test root -- --testPathPatterns="(api/audit|audit)"
```

This runs tests matching:

- `apps/root/src/app/api/audit/**`
- `apps/root/src/app/(public)/audit/**`
- `apps/root/src/app/tools/admin/audit/**`

### Phase 4: Dev Server + Browser Check

1. Read `TOOLS_ADMIN_PASSWORD` from `apps/root/.env.local` using Grep
2. Start the dev server: `pnpm nx dev root` (background)
3. Wait for it to be ready, then open a browser using Chrome DevTools MCP

**Public pages (no auth needed):**

4. Visit these pages and check console for errors/warnings:
   - `/audit` (scan input form)
   - `/audit/insights` (public insights dashboard)

**Admin pages (auth needed):**

5. Authenticate by running this in Chrome DevTools `evaluate_script`:
   ```js
   await fetch('/api/tools/login', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ password: '<TOOLS_ADMIN_PASSWORD value>' }),
   });
   ```
6. Verify the response status is 200 (the `admin_session` cookie is now set)
7. Visit admin pages and check console for errors/warnings:
   - `/tools/admin/audit` (admin dashboard — leads, scans, stats)

**For all pages, verify:**

- No unexpected console errors
- Page renders without blank screens or loading spinners that never resolve
- API calls return successfully (check Network tab if needed)

8. Stop the dev server when done

### Phase 5: Report

After all steps pass, report a summary table:

| Step                       | Result |
| -------------------------- | ------ |
| lint (audit-api)           | ...    |
| typecheck (audit-api)      | ...    |
| test (audit-api)           | ...    |
| typecheck (tsc)            | ...    |
| test (root — audit routes) | ...    |
| console.logs (public)      | ...    |
| console.logs (admin)       | ...    |

Note any pre-existing warnings separately.

If any fixes were made during verification, commit them before reporting.
