# Portfolio Feature Inventory

> Living document cataloging current features of danieljoffe.com.
> Use this to identify gaps, propose enhancements, and plan new work.

---

## Pages & Routes

### Public Pages

| Route                | Purpose                   | Key Features                                                                                                                                    |
| -------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `/` (Home)           | Landing page              | Hero with name/title/location, company logos carousel, achievement metrics, "How I Work" methodology cards, CTA section                         |
| `/about`             | Bio & contact             | Profile image, technical expertise badges, career timeline (SVG), experience cards, mantra/evolution timeline, contact form, social links       |
| `/services`          | Service offerings         | Services grid with pricing/timelines, 5-step "How I Work" process, audience cards, FAQ accordion, Calendly CTA                                  |
| `/projects`          | Project index             | Grid of PostCards, open-source callout (GitHub + Storybook links), structured data                                                              |
| `/projects/[slug]`   | Project detail (x9)       | MDX content, cover image, breadcrumbs, prev/next pagination, JSON-LD, OG image generation                                                       |
| `/experience`        | Experience index          | Vertical career timeline with company logos, "At a Glance" PostCard grid, structured data                                                       |
| `/experience/[slug]` | Experience detail (x5)    | MDX content, cover image, breadcrumbs, prev/next pagination, JSON-LD, OG image generation                                                       |
| `/audit`             | Free audit tool           | URL input form, "How It Works" explainer, completed scan counter (Supabase)                                                                     |
| `/audit/r/[id]`      | Audit report              | Pending/failed/completed states, device tabs (mobile/desktop), score cards, Core Web Vitals, issue list with severity, CTA, share functionality |
| `/audit/admin`       | Admin dashboard           | Password-gated, scans table, leads table, stats row (totals, conversion rate), sortable/paginated                                               |
| `/thank-you/email`   | Post-contact confirmation | Referer validation, redirect if accessed directly                                                                                               |

### Error & Loading States

- Custom 404 (`not-found.tsx`)
- Global error boundary with Sentry (`global-error.tsx`, inline styles)
- Per-page error boundaries: about, services, projects, experience, audit, audit/admin, audit/r/[id]
- Loading skeletons: audit, audit/admin, audit/r/[id]

---

## Content

| Type                    | Count | Location                        | Ordering                                   |
| ----------------------- | ----- | ------------------------------- | ------------------------------------------ |
| Projects (case studies) | 9     | `data/content/projects/*.mdx`   | Git creation date in `contentOrder.ts`     |
| Experience entries      | 5     | `data/content/experience/*.mdx` | Employment start date in `contentOrder.ts` |
| Services                | 4     | `data/services.ts`              | Manual order                               |

### Services Offered

1. **Performance Audits & Optimization** - $5,000, 2-4 weeks
2. **Component Libraries & Design Systems** - $10,000, 4-8 weeks
3. **CMS & Self-Serve Tooling** - $8,000, 3-6 weeks
4. **MVP & Product Frontend Builds** - $12,000, 4-12 weeks

---

## API Routes

### Audit System

| Endpoint                 | Method | Purpose                                                                                  |
| ------------------------ | ------ | ---------------------------------------------------------------------------------------- |
| `/api/audit/scan`        | POST   | Create scan (URL validation, bot detection, rate limiting, caching, mobile/desktop/both) |
| `/api/audit/status/[id]` | GET    | Poll scan status (paired scan support)                                                   |
| `/api/audit/report/[id]` | GET    | Retrieve completed report with issues                                                    |

### Admin (password-protected)

| Endpoint                  | Method | Purpose                                                   |
| ------------------------- | ------ | --------------------------------------------------------- |
| `/api/audit/admin/stats`  | GET    | Dashboard stats (total scans, today's, leads, conversion) |
| `/api/audit/admin/scans`  | GET    | Paginated/sortable scans list                             |
| `/api/audit/admin/leads`  | GET    | Paginated/sortable leads list                             |
| `/api/audit/admin/verify` | POST   | Password verification with rate limiting                  |

### Email System

| Endpoint                 | Method | Purpose                                                                    |
| ------------------------ | ------ | -------------------------------------------------------------------------- |
| `/api/email/contact`     | POST   | Contact form submission (validation, bot detection, rate limiting, Resend) |
| `/api/email/sequence`    | GET    | Cron-triggered drip emails (QuickWin at 3 days, FollowUp at 7 days)        |
| `/api/email/unsubscribe` | GET    | Token-validated unsubscribe (standalone HTML page)                         |

### Lead Capture

| Endpoint             | Method | Purpose                                                          |
| -------------------- | ------ | ---------------------------------------------------------------- |
| `/api/leads/capture` | POST   | Capture lead after audit (deduplication, sends FullReport email) |

---

## UI & Components

### Shared UI Library (`@danieljoffe/shared-ui`)

40+ components: Alert, AspectRatio, Avatar, Badge, Breadcrumb, Button, Card, Checkbox, Container, Divider, Dropdown, Grid/GridItem, Input, Loading, Modal, PageContainer, Pagination, ProgressBar, Section, Select, Sidebar, Skeleton, Spacer, Spinner, Stack, StatsCard, Switch, Table, Tabs, Textarea, ThemeProvider, ThemeToggle, Toast, Tooltip

**Constraint**: React + Tailwind only (no Next.js APIs).

### App Kit Components (`components/kit/`)

Section, SectionLabel, PageLayout, CTACard, GridBg, StructuredData, CoverImage, PostCard, CompanyLogo, Spinner, ErrorAlert, Pagination, PostPagination, FormFieldError

### App Components

- **Button** - Polymorphic (button/link), 8 variants, 3 sizes, loading state, `name` prop required
- **Nav** - Sticky header, GSAP-animated hamburger (MorphSVG), responsive (MobileNav / TabletUpNav), modal menu
- **Footer** - Social links, resume download, design system link, nav links
- **ContactForm** - Lazy-loaded, react-hook-form + yup, hCaptcha (intersection-loaded), Sentry tracking, toast feedback
- **Modal** - Focus trap integration
- **BreadCrumbs** - Navigation breadcrumbs
- **PostBody/PostContent** - MDX renderers
- **Email templates** - ContactNotification, FullReport, QuickWin, FollowUp (React-rendered HTML via Resend)

---

## State Management

| Provider | Purpose            | Key Details                                                            |
| -------- | ------------------ | ---------------------------------------------------------------------- |
| Theme    | Light/dark/system  | localStorage persistence, system preference listener, resolvedTheme    |
| Toast    | User notifications | 4 variants (info/success/warning/error), 4s auto-dismiss, bottom-right |
| Modal    | Mobile menu state  | Auto-close at md breakpoint, body scroll lock                          |

---

## Custom Hooks

| Hook                 | Purpose                                                       |
| -------------------- | ------------------------------------------------------------- |
| `useTableSort`       | Column sorting state with direction toggle and indicator      |
| `useFocusTrap`       | Modal accessibility (Tab/Shift+Tab trapping, Escape to close) |
| `useAdminTableFetch` | Admin table data fetching with sort/pagination/auth           |

---

## SEO & Metadata

- **Sitemap** (`sitemap.ts`) - Static + dynamic routes, priorities, change frequencies
- **Robots.txt** - Allow all except `/thank-you/` and `/api/`
- **Structured Data** - JSON-LD per content page (via `data/structuredData/`)
- **OpenGraph images** - Dynamic generation (`opengraph-image.tsx`)
- **Page metadata** - Auto-derived from MDX `metadata` export via `buildPostMetadata()`

---

## Analytics & Tracking

### Google Analytics Events

- Navigation: `navClick`, `mobileMenuToggle`
- CTAs: `ctaClick`
- Forms: `formStart`, `formSubmit`, `formError`
- Content: `projectClick`, `experienceClick`
- Theme: `themeToggle`
- Audit: `auditScanStarted`, `auditScanCompleted`, `auditScanFailed`, `auditEmailCaptured`, `auditCalendlyClicked`, `auditReportShared`

### Sentry Error Tracking

- Categories: render, api, form, network, validation, auth, config
- Severity levels: fatal, error, warning, info
- Specialized capture: `captureRenderError`, `captureApiError`, `captureFormError`, `captureNetworkError`
- Performance tracing with `withSpan`
- Client, server, and edge configs

### Vercel Analytics

- Integrated via Vercel platform

---

## Security & Protection

- **Rate limiting** - IP-based per endpoint (scans: 10/hr, contact: 5/hr, admin verify: 5/min)
- **Bot detection** - BotID on Vercel
- **hCaptcha** - Contact form (lazy-loaded on intersection)
- **Admin auth** - Bearer token via Authorization header
- **PII masking** - `data-sentry-mask` on form inputs
- **Cron auth** - CRON_SECRET for email sequence endpoint
- **Unsubscribe tokens** - Signed token validation

---

## Testing

### Unit Tests (Jest + React Testing Library)

- Coverage threshold: 25% minimum (branches, functions, lines, statements)
- GSAP mocks in `__mocks__/`
- Accessibility testing with jest-axe

### E2E Tests (Playwright) - 12 Suites

| Suite             | Focus                                            |
| ----------------- | ------------------------------------------------ |
| accessibility     | WCAG compliance (axe-core), skip links           |
| audit-scan        | Scan initiation, polling, email capture, sharing |
| audit-report      | Report display, pagination, issue details        |
| api-audit         | Audit API endpoints                              |
| api-email         | Email API endpoints                              |
| contact-form      | Submission, validation, captcha                  |
| navigation        | Links, responsive nav, mobile menu               |
| dynamic-routes    | Project/experience detail pages                  |
| error-handling    | 404, 500, error boundaries                       |
| services          | Services page rendering                          |
| visual-regression | Screenshot comparisons                           |
| performance       | Core Web Vitals, Lighthouse budgets              |

---

## Infrastructure

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Monorepo**: Nx workspace + Yarn workspaces
- **Styling**: Tailwind CSS 4 (oklch color space, `@theme` directive)
- **Animations**: GSAP 3 (MorphSVG plugin)
- **Database**: Supabase (scans, scan_issues, leads, email_log)
- **Email**: Resend (transactional emails)
- **Hosting**: Vercel
- **Audit service**: Express.js + Puppeteer (Lighthouse + Axe)
- **Storybook**: Available for root app and shared-ui library

---

## Potential Feature Ideas

> Add ideas here. Tag each with a category and rough complexity.
>
> **Categories**: content, ux, feature, infra, seo, analytics, a11y, perf
> **Complexity**: S (hours), M (days), L (weeks)

<!-- Example:
- [ ] [feature/M] Blog section with RSS feed
- [ ] [ux/S] Add scroll-to-top button
- [ ] [seo/M] Per-project canonical URLs and Twitter cards
-->
