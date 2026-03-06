---
name: nextjs-audit
description: Audit the Next.js app against official docs for performance, correctness, and best practices
disable-model-invocation: true
---

# Next.js Audit

Audit the Next.js application against current official documentation, producing actionable findings and direct code fixes.

## Instructions

### Phase 1: Fetch Current Documentation

Use the context7 MCP server (`resolve-library-id` then `query-docs`) to fetch documentation for each audit area. Every finding MUST cite a specific doc section. Do not rely on memorized knowledge — the docs are the source of truth.

Resolve and query these libraries:

1. **next** — App Router, rendering, caching, configuration, image optimization, metadata, fonts, scripts
2. **react** — Server Components, use/Suspense, hooks rules, concurrent features
3. **@sentry/nextjs** — if Sentry is in use (check `next.config.js`)
4. **tailwindcss** — if Tailwind is in use (check for `tailwind.config`)

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

#### 2.2 Data Fetching & Caching

Files to read: `app/api/**`, server components doing fetches, `next.config.js` (`revalidate`, `fetchCache`)

Check against docs:

- `fetch()` calls missing `cache` or `next.revalidate` options
- Route handlers missing appropriate HTTP caching headers
- Server actions/functions that should use `revalidatePath` or `revalidateTag`
- Data fetched in layouts that could be deduplicated with `cache()` from React
- Sequential data fetches that could be parallelized

#### 2.3 Metadata & SEO

Files to read: `app/**/page.tsx` (metadata exports), `app/**/opengraph-image.tsx`, `sitemap.ts`, `robots.ts`

Check against docs:

- Pages missing `metadata` or `generateMetadata` exports
- Incorrect metadata format (string vs object for `openGraph`, `twitter`, etc.)
- Missing or malformed `sitemap.ts` / `robots.ts`
- JSON-LD structured data issues
- Missing `viewport` export (should be in root layout only)

#### 2.4 Image Optimization

Files to read: all files importing `next/image`, `next.config.js` images config

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

Files to read: `next.config.js`, `tsconfig.json`, `vercel.json`

Check against docs:

- Deprecated config options
- `experimental` flags that have graduated to stable
- Webpack customizations that conflict with Next.js internals (especially `splitChunks`, `optimization`)
- Missing recommended settings for the detected Next.js version
- `outputFileTracingIncludes` correctness for serverless deployments

#### 2.7 Proxy / Middleware

Files to read: `proxy.ts` (or `middleware.ts`)

Check against docs:

- Matcher config correctness
- Response manipulation that could be done with `next.config.js` headers/redirects instead
- Heavy computation in proxy (runs on every matched request)
- CSP nonce generation and propagation

#### 2.8 Error Handling

Files to read: `error.tsx`, `global-error.tsx`, `not-found.tsx`, error boundaries

Check against docs:

- Missing `global-error.tsx` in app root
- `error.tsx` not marked `'use client'` (required by Next.js)
- Error boundaries not using `reset` function for recovery
- Missing error handling for parallel routes or intercepting routes

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
