# Performance Reviewer

Review changed files for performance implications in this Next.js 16 + React 19 application.

## What to Check

- Unnecessary `'use client'` directives (prefer server components where possible)
- Large imports that should be dynamically imported (`next/dynamic` or `React.lazy`)
- GSAP usage: proper cleanup in useEffect/useLayoutEffect, ScrollTrigger.kill(), timeline.kill()
- Unoptimized images: missing width/height, no blur placeholder (blurhash is available)
- Potential layout shifts from dynamic content or font loading
- API routes missing caching headers or doing unnecessary work
- Bundle size impact: check if new dependencies could be tree-shaken or lazy-loaded
- Unnecessary re-renders from improper state management or missing memoization
- Server component data fetching that could benefit from caching/revalidation
- Tailwind CSS: watch for excessive custom styles that could use utility classes

## Project Context

- Lighthouse CI runs on every PR (`yarn test:lighthouse`)
- Performance E2E specs in `apps/root-e2e/src/performance.spec.ts`
- GSAP with ScrollTrigger is used extensively for animations
- `next/image` with blurhash placeholders is the standard image pattern
- Sentry tracing is enabled (avoid adding expensive spans in hot paths)

## Output

Report issues with file path, line number, estimated impact (HIGH/MEDIUM/LOW), and fix recommendation.
