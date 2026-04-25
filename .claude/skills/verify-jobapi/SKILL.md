---
name: verify-jobapi
description: Verify the job-api backend and its Fitted frontend workflows
user-invocable: true
---

# Verify Job API

Run targeted verification for the job-api backend and its Fitted frontend integration. Fix any issues at each step before proceeding.

## Instructions

### Phase 1: Backend Checks

Run these sequentially, fixing failures before proceeding:

1. `pnpm nx lint job-api`
2. `pnpm nx mypy job-api`
3. `pnpm nx test job-api`

### Phase 2: TypeScript Typecheck

Run `pnpm tsc --noEmit`. This catches type errors in the Next.js API routes and frontend components that integrate with job-api.

### Phase 3: Frontend Unit Tests (API route subset)

Run the subset of root app tests that cover the job-api integration layer:

```bash
pnpm nx test root -- --testPathPatterns="(api/(jobs|career|targets)|fitted)"
```

This runs tests matching:

- `apps/root/src/app/api/jobs/**`
- `apps/root/src/app/api/career/**`
- `apps/root/src/app/api/targets/**`
- `apps/root/src/app/fitted/**`

### Phase 4: Dev Server + Authenticated Browser Check

1. Read `TOOLS_ADMIN_PASSWORD` from `apps/root/.env.local` using Grep
2. Start the dev server: `pnpm nx dev root` (background)
3. Wait for it to be ready, then open a browser using Chrome DevTools MCP
4. Navigate to `http://localhost:3000`
5. Authenticate by running this in Chrome DevTools `evaluate_script`:
   ```js
   await fetch('/api/tools/login', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ password: '<TOOLS_ADMIN_PASSWORD value>' }),
   });
   ```
6. Verify the response status is 200 (the `admin_session` cookie is now set)
7. Visit these Fitted pages and check console for errors/warnings:
   - `/fitted` (dashboard)
   - `/fitted/jobs` (job listings)
   - `/fitted/targets` (target roles)
   - `/fitted/profile` (experience profile)
   - `/fitted/insights` (analytics dashboard)
8. For each page, verify:
   - No unexpected console errors
   - Page renders without blank screens or loading spinners that never resolve
   - API calls return successfully (check Network tab if needed)
9. Stop the dev server when done

### Phase 5: Report

After all steps pass, report a summary table:

| Step                     | Result |
| ------------------------ | ------ |
| lint (job-api)           | ...    |
| mypy (job-api)           | ...    |
| test (job-api)           | ...    |
| typecheck                | ...    |
| test (root — job routes) | ...    |
| console.logs (Fitted)    | ...    |

Note any pre-existing warnings separately.

If any fixes were made during verification, commit them before reporting.
