# Architecture

## Monorepo Structure

- **apps/root**: Portfolio site, blog, and audit tool (Next.js 16, App Router)
- **apps/root-e2e**: Playwright E2E tests for `apps/root`
- **apps/wyrdfold**: WyrdFold product app (Next.js 16, App Router)
- **apps/wyrdfold-e2e**: Playwright E2E tests for `apps/wyrdfold`
- **apps/audit-api**: FastAPI service for Lighthouse/axe audits
- **apps/wyrdfold-api**: FastAPI service backing the WyrdFold product
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

## Databases (two separate Supabase projects)

There are **two** Supabase projects, each with its own CLI workdir, migration
history, and `pnpm` scripts:

| Concern                | Workdir                       | Backs                                                         | Scripts                                                      |
| ---------------------- | ----------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------ |
| Audit tool + portfolio | `supabase/` (repo root)       | `apps/root` (anonymous service-role writes; no auth users)    | `db:push`, `db:reset`, `db:gen-types`                        |
| wyrdfold product       | `apps/wyrdfold-api/supabase/` | `apps/wyrdfold` + `apps/wyrdfold-api` (owns all `auth.users`) | `db:wf:push`, `db:wf:reset`, `db:wf:pull`, `db:wf:gen-types` |

- The wyrdfold project is driven via the CLI's `--workdir apps/wyrdfold-api`
  flag (wrapped by the `db:wf:*` scripts). Never push wyrdfold migrations from
  the root workdir or vice versa.
- Generated types live separately: audit → `libs/shared/audit/src/lib/database.types.ts`;
  wyrdfold → `apps/wyrdfold/src/lib/supabase/types.ts`.
- `apps/wyrdfold` and `apps/root` read the _same_ env var names
  (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_ID`) but deploy as
  separate Vercel projects, so each points at its own Supabase project via env
  scope. `wyrdfold-api` (Railway) uses `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
  and derives its JWKS URL from `SUPABASE_URL`.

## Key Patterns

- Content access goes through `data/contentRegistry.ts` — the single data access layer
- Shared-ui must only depend on React and Tailwind CSS — no Next.js APIs
- Kit components (`components/kit/`) wrap Next.js-specific concerns (Link, Image, useRouter)
