# Architecture

## Monorepo Structure

- **apps/root**: Main Next.js 16 application (App Router)
- **apps/root-e2e**: Playwright E2E tests
- **apps/audit-scan-service**: Express service for Lighthouse/axe audits (Puppeteer)
- **libs/shared/ui**: Shared React component library (@danieljoffe.com/shared-ui)
- **libs/shared/audit**: Shared audit types and utilities

## App Structure (apps/root/src/)

```
app/                    # Next.js App Router pages
├── api/
│   ├── audit/          # Audit scan, report, status, admin endpoints
│   ├── email/          # Contact form & email sequence endpoints
│   └── leads/          # Lead capture endpoint
├── home/               # Homepage components (Hero, Achievements, etc.)
├── about/              # About page
├── audit/              # Audit tool page
├── blog/               # Blog pages with dynamic [slug] routes
├── experience/         # Experience pages with dynamic [slug] routes
├── projects/           # Projects pages with dynamic [slug] routes
├── services/           # Services page
└── thank-you/          # Thank you pages
components/             # App-specific React components
├── kit/                # Shared UI primitives (Spinner, ErrorAlert, PostPagination, etc.)
data/                   # Content data and metadata
├── content/            # MDX content files (projects/, experience/, blog/)
├── contentRegistry.ts  # Unified content registry (single data access layer)
├── contentTypeConfig.ts # Per-type config (basePath, label, contentDir)
├── contentOrder.ts     # Chronological ordering arrays per content type
├── metadata/           # Page metadata (SEO, OpenGraph)
├── structuredData/     # JSON-LD structured data (blog + project auto-derived from MDX)
├── buildThumbnail.ts   # Derives PostThumbnail shape from MDX metadata
├── readingTimes.ts     # Pre-computed reading times per post
├── blog.ts, project.ts, experience.ts  # Slug constants per content type
├── profileData.ts      # Author profile data
├── services.ts, offerings.ts, about.ts # Page-specific data
└── __tests__/          # Data layer test fixtures
hooks/                  # Custom React hooks (useTableSort, useFocusTrap)
lib/                    # Utility libraries and configurations (cn, formStyles, badgeStyles)
state/                  # Global state management
types/                  # TypeScript type definitions
utils/                  # Helper functions and constants
```

## UI Library (libs/shared/ui/src/lib/)

Shared components: Alert, AspectRatio, Avatar, Badge, Breadcrumb, Button, Card, Checkbox, Container, CTACard, Divider, Dropdown, FormFieldError, Grid, GridBg, Heading, Input, Kbd, Loading, Modal, PageContainer, PageLayout, Pagination, ProgressBar, Section, SectionLabel, Select, Sidebar, Skeleton, Spacer, Spinner, Stack, StatsCard, StructuredData, Switch, Table, Tabs, Text, Textarea, ThemeProvider, ThemeToggle, Toast, Tooltip

## Key Technologies

- **Framework**: Next.js 16 with App Router
- **Styling**: Tailwind CSS 4
- **Animations**: GSAP
- **Forms**: react-hook-form with yup validation
- **Error Tracking**: Sentry (client: instrumentation-client.ts, server: sentry.server.config.ts, edge: sentry.edge.config.ts)
- **Analytics**: Vercel Analytics, Google Analytics
- **Testing**: Jest + React Testing Library (unit), Playwright (E2E), jest-axe (accessibility)

## Path Aliases

- `@/` maps to `apps/root/src/` in the root app
- `@danieljoffe.com/shared-audit` maps to `libs/shared/audit/src/index.ts`

## Nx Plugins

The workspace uses Nx plugins for automatic target inference:

- @nx/js/typescript (typecheck, build)
- @nx/next/plugin (build, dev, start)
- @nx/jest/plugin (test)
- @nx/playwright/plugin (e2e)
- @nx/eslint/plugin (lint)
- @nx/storybook/plugin (storybook, build-storybook)
- @nx/vite/plugin (vitest)
- @nx/docker (docker-build)
