---
name: nextjs-audit
description: Audit the Next.js app against official docs for performance, correctness, and best practices
disable-model-invocation: true
---

# Next.js Audit

Audit the Next.js application against current official documentation, producing actionable findings and direct code fixes.

## Token Budget Rules

- Route ALL file reads and command outputs through `ctx_batch_execute` or `ctx_execute`
- Batch context7 `query-docs` calls — resolve all libraries first, then query in 2-3 batched calls
- If context7 docs for the same libraries were already fetched in this session, skip Phase 1

## Instructions

### Phase 1: Fetch Current Documentation

Use the context7 MCP server (`resolve-library-id` then `query-docs`) to fetch documentation for each audit area. Every finding MUST cite a specific doc section. Do not rely on memorized knowledge — the docs are the source of truth.

Resolve and query these libraries:

1. **next** (use `/vercel/next.js`, prefer latest version tag) — App Router, rendering, caching, `use cache` directive, `cacheComponents` (PPR), `connection()`, `after()`, metadata API, image optimization, fonts, scripts, Turbopack
2. **react** — Server Components, `use()`, Suspense, hooks rules, React 19 patterns (no `forwardRef`, `ref` as prop)
3. **@sentry/nextjs** — if Sentry is in use (check `next.config`)
4. **tailwindcss** — if Tailwind is in use (check for Tailwind config or `@theme` directive)

### Phase 2: Audit Areas

For each area below, read the relevant source files, compare against fetched docs, and report findings.

#### 2.1 Rendering Strategy

Files to read: `app/layout.tsx`, `app/**/page.tsx`, `app/**/layout.tsx`, any file with `'use client'`

Check against docs:

- Components marked `'use client'` that don't use hooks, event handlers, or browser APIs (should be server components)
- Client boundaries drawn too high — wrapping children that could be server-rendered
- `headers()`, `cookies()`, or `searchParams` usage forcing dynamic rendering unnecessarily
- Missing or misused `loading.tsx` / `error.tsx` / `not-found.tsx` conventions
- Layouts re-rendering when they should be cached (shared layouts between routes)
- **React 19**: components using `forwardRef` instead of accepting `ref` as a regular prop
- **PPR opportunity**: pages mixing static and dynamic content that could use `cacheComponents: true` with Suspense boundaries

#### 2.2 Data Fetching & Caching

Files to read: `app/api/**`, server components doing fetches, `next.config` (`revalidate`, `fetchCache`)

Check against docs:

- `fetch()` calls missing `cache` or `next.revalidate` options
- Route handlers missing appropriate HTTP caching headers
- Server actions/functions that should use `revalidatePath` or `revalidateTag`
- Data fetched in layouts that could be deduplicated with `cache()` from React
- Sequential data fetches that could be parallelized
- **`use cache` directive**: functions or components doing expensive computation that could benefit from the `'use cache'` directive with `cacheLife()` configuration
- **`connection()`**: dynamic security/auth checks that should use `await connection()` to defer to request time before cached computation

#### 2.3 Metadata & SEO

Files to read: `app/**/page.tsx` (metadata exports), `app/**/opengraph-image.tsx`, `sitemap.ts`, `robots.ts`

Check against docs:

- Pages missing `metadata` or `generateMetadata` exports
- Incorrect metadata format (string vs object for `openGraph`, `twitter`, etc.)
- Missing or malformed `sitemap.ts` / `robots.ts`
- JSON-LD structured data issues
- Missing `viewport` export (should be in root layout only)

#### 2.4 Image Optimization

Files to read: all files importing `next/image`, `next.config` images config

Check against docs:

- Images missing `width`/`height` or `fill` prop (causes layout shift)
- Missing `sizes` prop when using `fill` (sends oversized images)
- LCP images missing `priority` prop
- `remotePatterns` overly permissive (wildcard hostnames)
- Deprecated `domains` config (should use `remotePatterns`)
- Custom loaders not following documented patterns

#### 2.5 Script & Font Loading

Files to read: files using `next/script`, font config files, `<head>` customizations

Check against docs:

- Scripts using `beforeInteractive` when `afterInteractive` or `lazyOnload` would suffice
- Fonts not using `next/font` (causes layout shift from FOUT/FOIT)
- Inline scripts that should use `next/script` for proper loading strategy
- Render-blocking resources in `<head>`

#### 2.6 Configuration

Files to read: `next.config.mjs` (or `.ts`), `tsconfig.json`, `vercel.json`

Check against docs:

- Deprecated config options
- `experimental` flags that have graduated to stable (check current docs for what's now stable)
- **`cacheComponents`**: whether PPR should be enabled (replaces `experimental.ppr`)
- Webpack customizations that conflict with Next.js internals (especially `splitChunks`, `optimization`)
- Missing recommended settings for the detected Next.js version
- `outputFileTracingIncludes` correctness for serverless deployments
- **Turbopack**: if `--turbopack` is used in dev, verify config compatibility

#### 2.7 Middleware

Files to read: `middleware.ts` (or `proxy.ts`)

Check against docs:

- Matcher config correctness
- Response manipulation that could be done with `next.config` headers/redirects instead
- Heavy computation in middleware (runs on every matched request)
- CSP nonce generation and propagation
- **`forbidden()` / `unauthorized()`**: new Next.js auth helpers that should be used instead of manual 401/403 responses

#### 2.8 Error Handling

Files to read: `error.tsx`, `global-error.tsx`, `not-found.tsx`, error boundaries

Check against docs:

- Missing `global-error.tsx` in app root
- `error.tsx` not marked `'use client'` (required by Next.js)
- Error boundaries not using `reset` function for recovery
- Missing error handling for parallel routes or intercepting routes

#### 2.9 Post-Request Work

Files to read: API routes, server actions, any file using `waitUntil` or background work

Check against docs:

- Background work that should use the `after()` API instead of `waitUntil` or fire-and-forget patterns
- Analytics, logging, or cache warming that blocks the response unnecessarily

### Phase 3: Apply Fixes

For findings rated HIGH or with a clear, safe fix:

- Use the Edit tool to apply the fix directly
- Leave a brief inline comment only if the change isn't self-evident
- Do NOT add comments that just restate what the code does

For findings that require design decisions or have trade-offs:

- Report as recommendations without editing

### Phase 4: Report

## Output Format

Present findings grouped by audit area. For each finding:

```
### [AREA] Finding Title

**Severity**: HIGH | MEDIUM | LOW
**File**: path/to/file.tsx:line
**Doc Reference**: [section name from docs]
**Status**: FIXED | RECOMMENDATION

**Issue**: What violates the documented best practice.

**Fix** (if applied): Brief description of the change made.

**Recommendation** (if not applied): What to do and why, with a code example.
```

After all findings, include a summary table:

| Area | HIGH | MEDIUM | LOW | Fixed |
| ---- | ---- | ------ | --- | ----- |
| ...  | ...  | ...    | ... | ...   |

End with a "Next Steps" section listing recommended follow-up actions in priority order.
