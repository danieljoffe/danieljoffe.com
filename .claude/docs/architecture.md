# Architecture

- **apps/root** — portfolio + blog (Next.js 16, App Router); **apps/root-e2e** — Playwright E2E; **libs/shared/ui** — shared component library (`@danieljoffe/shared-ui`)
- Stack: Nx + pnpm workspaces, Tailwind CSS 4, GSAP, MiniSearch (client-side blog search), react-hook-form + yup, Sentry. Tests: Jest + RTL, Playwright, jest-axe, Vitest (shared-ui)
- Path alias: `@/` → `apps/root/src/`
- All content access goes through `data/contentRegistry.ts` — the single data access layer
