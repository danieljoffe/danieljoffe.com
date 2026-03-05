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
4. Report only HIGH-CONFIDENCE findings (>80% exploitable)
5. Skip: DoS, rate limiting, test files, theoretical issues, dependency vulnerabilities

## Output Format

Report findings as:

- File and line number
- Severity (HIGH/MEDIUM)
- Description with exploit scenario
- Fix recommendation

If no vulnerabilities found, state that clearly.
