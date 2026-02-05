# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio website for Daniel Joffe built with Next.js 15 (App Router), React 19, and TypeScript. This is an Nx monorepo with Yarn workspaces.

Live site: https://danieljoffe.com

## Commands

### Development

```bash
npx nx dev root                    # Start dev server at localhost:3000
npx nx build root                  # Build for production
npx nx start root                  # Start production server
```

### Testing

```bash
npx nx test root                   # Run unit tests
npx nx test root --watch           # Run tests in watch mode
npx nx test root -- --testPathPattern="Button"  # Run single test file
npx nx e2e root-e2e                # Run E2E tests (Playwright)
npx playwright test accessibility.spec.ts       # Run specific E2E test
yarn test:coverage                 # Run all tests with coverage
yarn test:lighthouse               # Run Lighthouse CI
```

### Linting & Formatting

```bash
yarn lint                          # Lint all projects
yarn lint:fix                      # Lint and auto-fix
yarn format                        # Format with Prettier
yarn typecheck                     # TypeScript type checking
```

### Storybook

```bash
npx nx storybook root              # Start Storybook for root app
npx nx storybook @danieljoffe.com/ui  # Start Storybook for UI library
```

## Architecture

### Monorepo Structure

- **apps/root**: Main Next.js 15 application (App Router)
- **apps/root-e2e**: Playwright E2E tests
- **libs/ui**: Shared React component library (@danieljoffe.com/ui)

### App Structure (apps/root/src/)

```
app/                    # Next.js App Router pages
├── api/email/          # Contact form API endpoint
├── home/               # Homepage components (Hero, Achievements, etc.)
├── about/              # About page
├── experience/         # Experience pages with dynamic [slug] routes
├── projects/           # Projects pages with dynamic [slug] routes
├── services/           # Services page
└── thank-you/          # Thank you pages
components/             # App-specific React components
lib/                    # Utility libraries and configurations
state/                  # Global state management
types/                  # TypeScript type definitions
utils/                  # Helper functions and constants
```

### UI Library (libs/ui/src/lib/)

Shared components: Alert, Badge, Button, Card, Checkbox, Container, Divider, Grid, Input, Loading, Modal, PageContainer, ProgressBar, Select, Spacer, Spinner, Stack, Switch, Tabs, Textarea, Tooltip

### Key Technologies

- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS 4
- **Animations**: GSAP
- **Forms**: react-hook-form with yup validation
- **Error Tracking**: Sentry (client: instrumentation-client.ts, server: sentry.server.config.ts, edge: sentry.edge.config.ts)
- **Analytics**: Vercel Analytics, Google Analytics
- **Testing**: Jest + React Testing Library (unit), Playwright (E2E), jest-axe (accessibility)

### Path Aliases

- `@/` maps to `apps/root/src/` in the root app

## Nx Plugins

The workspace uses Nx plugins for automatic target inference:

- @nx/next/plugin (build, dev, start)
- @nx/jest/plugin (test)
- @nx/playwright/plugin (e2e)
- @nx/eslint/plugin (lint)
- @nx/storybook/plugin (storybook, build-storybook)

## Testing Notes

### Unit Tests

- Jest config: `apps/root/jest.config.ts`
- Setup file: `apps/root/src/test-setup.ts`
- GSAP plugins are mocked in `apps/root/__mocks__/`
- Coverage threshold: 25% minimum (branches, functions, lines, statements)

### E2E Tests

- Config: `apps/root-e2e/playwright.config.ts`
- Tests: accessibility, navigation, contact-form, performance, dynamic-routes, error-handling
- CI runs only Chromium; local runs all browsers + mobile

## Sentry Integration

Use `import * as Sentry from "@sentry/nextjs"` for all Sentry functionality. Key patterns:

- Exception catching: `Sentry.captureException(error)`
- Tracing spans: `Sentry.startSpan({ op: 'ui.click', name: 'Button Click' }, span => { ... })`
- Logging: `const { logger } = Sentry` then `logger.info('message', { key: value })`
