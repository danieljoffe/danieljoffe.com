# Commands

## Development

```bash
pnpm nx dev root                   # Start dev server at localhost:3000
pnpm nx build root                 # Build for production
pnpm nx start root                 # Start production server
```

## Testing

```bash
pnpm nx test root                  # Run unit tests
pnpm nx test root --watch          # Run tests in watch mode
pnpm nx test root -- --testPathPattern="Button"  # Run single test file
pnpm nx e2e root-e2e               # Run E2E tests (Playwright)
pnpm exec playwright test accessibility.spec.ts  # Run specific E2E test
pnpm test:coverage                 # Run all tests with coverage
pnpm test:lighthouse               # Run Lighthouse CI
```

## Linting & Formatting

```bash
pnpm lint                          # Lint all projects
pnpm lint:fix                      # Lint and auto-fix
pnpm format                        # Format with Prettier
pnpm typecheck                     # TypeScript type checking
```

## Quality Gate

```bash
pnpm pom                           # Full pipeline: typecheck → lint → format → test → coverage → e2e → Lighthouse
pnpm pom:affected                  # Same shape as pom but each step uses `nx affected` (skips python + lighthouse)
pnpm affected                      # Run lint, test, build, typecheck, e2e on affected projects only
```

**When to use which**:

- `pnpm pom` — pre-push verification. Runs everything against every project. Slow but thorough. Includes `test:python` and `test:lighthouse`.
- `pnpm pom:affected` — fast iteration loop. Runs typecheck → lint:fix → format → test+coverage → e2e, but each Nx step only touches projects affected since the default base (`main`). Skips `test:python` (run manually if Python changes) and `test:lighthouse` (run separately when measuring perf).
- `pnpm affected` — single Nx invocation across lint/test/build/typecheck/e2e. No format, no coverage. Useful for quick "is anything broken?" checks.

## Storybook

```bash
pnpm nx storybook root             # Start Storybook for root app
pnpm nx storybook @danieljoffe/shared-ui  # Start Storybook for UI library
pnpm chromatic:ui                  # Push shared-ui Storybook to Chromatic
```
