---
name: security-review
description: Security-focused code review of current branch changes
disable-model-invocation: true
---

# Security Review

Perform a security-focused code review of the changes on the current branch compared to main.

## Instructions

1. Run `git diff main...HEAD` to get all changes on the current branch
2. Identify all modified files, focusing on:
   - API routes (`apps/root/src/app/api/`)
   - Proxy/middleware (`apps/root/src/proxy.ts`)
   - Server-side code and data fetching
   - Environment variable usage
   - Authentication/authorization logic
   - Supabase queries and RLS considerations
   - Email/Resend integrations
   - CSP and security headers
3. For each changed file, analyze for:
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
