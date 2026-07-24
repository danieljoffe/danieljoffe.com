# Architecture

## Monorepo Structure

- **apps/root**: Portfolio site and blog (Next.js 16, App Router)
- **apps/root-e2e**: Playwright E2E tests for `apps/root`
- **libs/shared/ui**: Shared React component library (@danieljoffe/shared-ui)

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

## Key Patterns

- Content access goes through `data/contentRegistry.ts` — the single data access layer
