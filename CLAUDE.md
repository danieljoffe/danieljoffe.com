# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio website for Daniel Joffe built with Next.js 16 (App Router), React 19, and TypeScript. This is an Nx monorepo with Yarn workspaces.

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
npx nx storybook @danieljoffe.com/shared-ui  # Start Storybook for UI library
```

## Architecture

### Monorepo Structure

- **apps/root**: Main Next.js 16 application (App Router)
- **apps/root-e2e**: Playwright E2E tests
- **apps/audit-scan-service**: Express service for Lighthouse/axe audits (Puppeteer)
- **libs/shared/ui**: Shared React component library (@danieljoffe.com/shared-ui)
- **libs/shared/audit**: Shared audit types and utilities

### App Structure (apps/root/src/)

```
app/                    # Next.js App Router pages
├── api/
│   ├── audit/          # Audit scan, report, status, admin endpoints
│   ├── email/          # Contact form & email sequence endpoints
│   └── leads/          # Lead capture endpoint
├── home/               # Homepage components (Hero, Achievements, etc.)
├── about/              # About page
├── audit/              # Audit tool page
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

### UI Library (libs/shared/ui/src/lib/)

Shared components: Alert, AspectRatio, Badge, Button, Card, Checkbox, Container, Divider, Grid, Input, Loading, Modal, PageContainer, ProgressBar, Section, Select, Spacer, Spinner, Stack, Switch, Tabs, Textarea, Tooltip

### Key Technologies

- **Framework**: Next.js 16 with App Router
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

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

## General Guidelings for working with NextJS

**When starting work on a Next.js project, ALWAYS call the `init` tool from
next-devtools-mcp FIRST to set up proper context and establish documentation
requirements. Do this automatically without being asked.**
