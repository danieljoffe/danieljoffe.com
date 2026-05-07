---
name: security-review
description: Security-focused code review of current branch changes
disable-model-invocation: true
---

# Security Review

Perform a security-focused code review of the changes on the current branch.

## Token Budget Rules

- Route `git diff` output and file reads through `ctx_batch_execute` — diffs can be very large
- Use `ctx_search` to find specific patterns in indexed diff output rather than re-reading files

## Instructions

### Step 1: Detect base branch

```bash
gh pr view --json baseRefName --jq '.baseRefName' 2>/dev/null || echo "develop"
```

Use the result as `BASE_BRANCH`. Always `git fetch origin` first.

### Step 2: Build file manifest and filter

Run via `ctx_batch_execute`:

```bash
git diff --name-status origin/${BASE_BRANCH}...HEAD
git diff --stat origin/${BASE_BRANCH}...HEAD
```

**Skip these files entirely** — they cannot contain security issues:

- Deleted files (status `D`)
- Binary files (`*.png`, `*.jpg`, `*.svg`, `*-snapshots/*`)
- Meta files (`.claude/`, `CLAUDE.md`, `*.md` docs)
- Test files (`*.spec.*`, `*.test.*`, `__tests__/*`, `__mocks__/*`, `apps/root-e2e/**`)
- MDX content files (`data/content/**/*.mdx`)
- Stories (`*.stories.tsx`)

**Prioritize these files** — highest security relevance:

- API routes (`apps/root/src/app/api/`)
- Proxy/middleware (`proxy.ts`, `middleware.ts`)
- Server-side code and data fetching
- Environment variable usage
- Authentication/authorization logic
- Supabase queries and RLS considerations
- Email/Resend integrations
- CSP and security headers (`next.config.mjs`)

### Step 3: Diff-first review

For each security-relevant file:

- **< 10 lines changed**: Review the diff hunk only. Skip full file read.
- **10–100 lines changed**: Review the diff hunk. Read full file only if the hunk context is insufficient to assess exploitability.
- **> 100 lines or new files**: Read the full file via `ctx_batch_execute`.

### Step 4: Analyze for:

- Input validation vulnerabilities (SQL injection, XSS, command injection)
- Authentication/authorization bypasses
- Sensitive data exposure (PII logging, secrets in responses)
- SSRF in scan service URL handling
- Insecure cryptographic patterns
- Missing rate limiting on new endpoints
- XSS: components must use `isomorphic-dompurify` for user-generated HTML; no `dangerouslySetInnerHTML` without sanitization
- PII masking: form inputs collecting PII must have `data-sentry-mask` attribute
- hCaptcha: form submissions must validate captcha tokens server-side

4. **Project-specific concerns:**
   - `@supabase/supabase-js` — browser client must only use anon key, never service role key
   - `resend` — email sending must validate recipient addresses and sanitize content
   - `apps/audit-api` — Lighthouse/axe scans must not allow arbitrary URL scanning without auth; SSRF defenses on `/run-scan` URL input
   - `botid` — bot detection should not be the sole security layer
   - Contact form and lead capture endpoints are public-facing attack surface
   - CSP headers in `next.config.mjs` must not be weakened by changes
5. Report only HIGH-CONFIDENCE findings (>80% exploitable)
6. Skip: DoS, test files, theoretical issues, dependency vulnerabilities

## Output Format

Report findings as:

- File and line number
- Severity (HIGH/MEDIUM)
- Description with exploit scenario
- Fix recommendation

If no vulnerabilities found, state that clearly.
