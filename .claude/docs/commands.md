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
pnpm affected                      # Run lint, test, build, typecheck, e2e on affected projects only
```

## Storybook

```bash
pnpm nx storybook root             # Start Storybook for root app
pnpm nx storybook @danieljoffe.com/shared-ui  # Start Storybook for UI library
pnpm chromatic:ui                  # Push shared-ui Storybook to Chromatic
```

## Database (Supabase)

```bash
pnpm db:push                       # Push migrations to linked Supabase project
pnpm db:reset                      # Reset database to clean state
pnpm db:gen-types                  # Regenerate TypeScript types from schema
```
