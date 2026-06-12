# Architecture

## Monorepo Structure

- **apps/root**: Portfolio site, blog, and audit tool (Next.js 16, App Router)
- **apps/root-e2e**: Playwright E2E tests for `apps/root`
- **apps/audit-api**: FastAPI service for Lighthouse/axe audits
- **libs/shared/ui**: Shared React component library (@danieljoffe/shared-ui)
- **libs/shared/audit**: Shared audit types and utilities

## Key Technologies

- **Monorepo**: Nx with pnpm workspaces
- **Framework**: Next.js 16 with App Router
- **Styling**: Tailwind CSS 4
- **Animations**: GSAP
- **Search**: MiniSearch (client-side full-text search on blog index)
- **Forms**: react-hook-form with yup validation
- **Error Tracking**: Sentry
- **Testing**: Jest + RTL (unit), Playwright (E2E), jest-axe (a11y), Vitest (shared-ui)

## Path Aliases

- `@/` maps to `apps/root/src/` in the root app
- `@danieljoffe.com/shared-audit` maps to `libs/shared/audit/src/index.ts`

## Key Patterns

- Content access goes through `data/contentRegistry.ts` — the single data access layer
- Shared-ui must only depend on React and Tailwind CSS — no Next.js APIs
- Kit components (`components/kit/`) wrap Next.js-specific concerns (Link, Image, useRouter)
