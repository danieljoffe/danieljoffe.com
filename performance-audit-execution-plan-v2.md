# Performance Audit Tool — Execution Plan

> **Revision Notes (Claude Review)**
>
> The following changes were made to the original spec. Search for `CHANGED:` comments inline for context.
>
> **Critical Fixes:**
>
> - **Dockerfile broken build** — Original ran `npm ci --only=production` then `npm run build`, which fails because TypeScript is a devDependency. Replaced with a multi-stage Docker build.
> - **In-memory rate limiting on Vercel** — `Map`-based rate limiting is stateless across serverless invocations and does nothing in production. Replaced with a Supabase query against the `scans` table (count recent scans by IP hash). Added a note to migrate to Vercel KV / Upstash for higher traffic.
> - **Base64 screenshots in Postgres** — Storing data URLs in a `TEXT` column bloats rows to several MB each, killing query performance and storage costs. Replaced with Supabase Storage upload; only the public URL is stored.
> - **RLS policies** — Removed redundant `service_role` policies (Supabase's service role key bypasses RLS entirely). Tightened `scan_issues` public read to only allow access for completed scans.
> - **No unsubscribe mechanism** — Original schema and email sequence had no way for leads to opt out, which is a CAN-SPAM/GDPR violation. Added `unsubscribed` + `unsubscribed_at` columns, an unsubscribe API route, and filtering in the cron job.
>
> **Security Hardening:**
>
> - **CORS wide open on scan service** — `app.use(cors())` allows any origin to hit the scanner. Locked down to `ALLOWED_ORIGIN` env var.
> - **Weak IP hashing** — The original DJB-style hash is trivially reversible for IPv4 addresses. Replaced with a salted SHA-256 truncation.
> - **URL validation gaps** — Added IPv6 loopback (`::1`), link-local (`169.254.x.x`, `fe80::`), and a note about DNS rebinding for production hardening.
> - **Email validation** — `includes('@')` accepts strings like `@` or `@@`. Replaced with a basic regex pattern.
>
> **Reliability:**
>
> - **Scan timeout** — No timeout on the scanner meant a hung Chrome process could block the worker indefinitely. Added a 90-second `Promise.race` timeout.
> - **Concurrency control** — Multiple simultaneous scans on a single Railway container could exhaust memory and crash the service. Added `MAX_CONCURRENT_SCANS` guard with a 503 response.
> - **Scan deduplication** — No check for recently scanned URLs meant users could burn Railway compute on the same URL repeatedly. Added a 1-hour cache window that returns the existing report.
>
> **Theme/Branding Alignment:**
>
> - Updated typography references from Plus Jakarta Sans / Ibarra Real Nova → **Inter / Fraunces** to match your current portfolio.
> - Replaced hardcoded hex values for the dark theme with a note to use existing design tokens (your Deep Teal palette).

---

## Purpose

This document is a step-by-step execution plan for building a performance audit tool integrated into an existing Next.js portfolio site (danieljoffe.com). It is written to be parsed and executed by an LLM-powered coding assistant (e.g., Cursor AI, Claude).

Each phase is self-contained with clear inputs, outputs, acceptance criteria, and dependencies. Phases must be completed in order — each builds on the previous.

---

## Project Context

### Existing Application

- **Framework:** Next.js (App Router) with TypeScript
- **Monorepo:** NX
- **Styling:** Tailwind CSS
- **Hosting:** Vercel
- **Repository:** danieljoffe.com portfolio site
- **Typography:** Inter (body), Fraunces (display headings)
- **Theme:** Deep Teal dark theme (refer to existing site tokens for exact background, surface, and text colors)

### What We're Building

A free website performance audit tool that:

1. Accepts a URL from a user
2. Runs Lighthouse + axe-core against it via a separate scan service
3. Presents results as a branded, non-technical report with letter grades (A-F)
4. Captures leads via email gating on the full report
5. Provides a CTA to book a consultation via Calendly
6. Includes a password-protected admin dashboard to view scan activity and leads

### Architecture Overview

```
┌─────────────────────────────────────────────┐
│  danieljoffe.com (Vercel)                   │
│  Next.js App Router                         │
│                                             │
│  Routes:                                    │
│    /audit          → Scan landing page      │
│    /audit/r/[id]   → Report page            │
│    /audit/admin    → Admin dashboard        │
│                                             │
│  API Routes:                                │
│    /api/audit/scan     → Trigger scan       │
│    /api/audit/status   → Poll progress      │
│    /api/audit/report   → Fetch results      │
│    /api/leads/capture  → Email capture      │
│    /api/email/send     → Send via Resend    │
│                                             │
└──────────┬──────────────────┬───────────────┘
           │                  │
           ▼                  ▼
┌──────────────────┐  ┌──────────────────┐
│  Scan Service    │  │  Supabase        │
│  (Railway)       │  │  (Postgres)      │
│                  │  │                  │
│  Express + TS    │  │  Tables:         │
│  Chrome Headless │  │    scans         │
│  Lighthouse      │  │    scan_issues   │
│  axe-core        │  │    leads         │
│                  │  │    email_log     │
└──────────────────┘  └──────────────────┘
```

### Tech Stack

| Layer      | Technology                                       |
| ---------- | ------------------------------------------------ |
| Framework  | Next.js 14+ (App Router), TypeScript             |
| Styling    | Tailwind CSS                                     |
| Hosting    | Vercel (Next.js app), Railway (scan service)     |
| Scanning   | lighthouse, chrome-launcher, @axe-core/puppeteer |
| Database   | Supabase (Postgres)                              |
| Email      | Resend, React Email                              |
| Scheduling | Calendly (embedded)                              |
| Analytics  | Google Analytics (existing)                      |

---

## Phase 0: Project Setup & Infrastructure

### 0.1 Supabase Setup

**Goal:** Create the database tables that will store all scan data, issues, and leads.

**Instructions:**

1. Create a new Supabase project (or use existing if one exists)
2. Run the following SQL migration in the Supabase SQL Editor

```sql
-- ============================================
-- MIGRATION: Create audit tool tables
-- ============================================

-- Table: scans
-- Primary record for every audit run
CREATE TABLE IF NOT EXISTS scans (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url                  TEXT NOT NULL,
  normalized_url       TEXT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  completed_at         TIMESTAMPTZ,
  error_message        TEXT,

  -- Lighthouse scores (0-100)
  score_performance    INTEGER,
  score_accessibility  INTEGER,
  score_best_practices INTEGER,
  score_seo            INTEGER,

  -- Computed grade
  grade_overall        TEXT CHECK (grade_overall IN ('A', 'B', 'C', 'D', 'F')),

  -- Core Web Vitals
  fcp_ms               REAL,
  lcp_ms               REAL,
  tbt_ms               REAL,
  cls                  REAL,
  si_ms                REAL,

  -- Page metadata
  page_title           TEXT,
  page_description     TEXT,
  page_screenshot_url  TEXT,

  -- Raw data
  lighthouse_raw       JSONB,
  axe_raw              JSONB,

  -- Tracking
  source               TEXT DEFAULT 'organic',
  ip_hash              TEXT
);

CREATE INDEX IF NOT EXISTS idx_scans_normalized_url ON scans(normalized_url);
CREATE INDEX IF NOT EXISTS idx_scans_status ON scans(status);
CREATE INDEX IF NOT EXISTS idx_scans_created_at ON scans(created_at DESC);

-- Table: scan_issues
-- Individual issues found during a scan
CREATE TABLE IF NOT EXISTS scan_issues (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id           UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  category          TEXT NOT NULL CHECK (category IN ('performance', 'accessibility', 'seo', 'ux')),
  severity          TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  title             TEXT NOT NULL,
  description       TEXT NOT NULL,
  impact            TEXT,
  fix_difficulty    TEXT CHECK (fix_difficulty IN ('easy', 'moderate', 'complex')),
  technical_detail  JSONB,
  sort_order        INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_scan_issues_scan_id ON scan_issues(scan_id);
CREATE INDEX IF NOT EXISTS idx_scan_issues_severity ON scan_issues(severity);

-- Table: leads
-- Email captures from the report page
CREATE TABLE IF NOT EXISTS leads (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id               UUID REFERENCES scans(id),
  email                 TEXT NOT NULL,
  name                  TEXT,
  company               TEXT,
  url_scanned           TEXT,
  source                TEXT DEFAULT 'full_report',
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  email_sequence_step   INTEGER DEFAULT 0,
  last_email_at         TIMESTAMPTZ,
  unsubscribed          BOOLEAN DEFAULT FALSE,
  unsubscribed_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- Table: email_log
-- Track emails sent for the follow-up sequence
CREATE TABLE IF NOT EXISTS email_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  template    TEXT NOT NULL,
  sent_at     TIMESTAMPTZ DEFAULT NOW(),
  resend_id   TEXT
);

-- Enable Row Level Security
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

-- Policies: anon key can only read completed scans and their issues.
-- All writes happen via service_role key, which bypasses RLS entirely,
-- so no service_role policies are needed.

CREATE POLICY "Public can read completed scans"
  ON scans FOR SELECT
  USING (status = 'completed');

-- Only allow reading issues for completed scans (join check)
CREATE POLICY "Public can read issues for completed scans"
  ON scan_issues FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM scans
      WHERE scans.id = scan_issues.scan_id
      AND scans.status = 'completed'
    )
  );

-- leads and email_log have no public read policies — only accessible via service_role
```

3. Create a Supabase Storage bucket named `screenshots` (set to public) for storing scan screenshots

4. Note the following values from Supabase dashboard → Settings → API:
   - Project URL (`NEXT_PUBLIC_SUPABASE_URL`)
   - Anon public key (`NEXT_PUBLIC_SUPABASE_ANON_ID`)
   - Service role key (`SUPABASE_SERVICE_ROLE_KEY`)

**Acceptance Criteria:**

- [ ] All 4 tables exist in Supabase
- [ ] Indexes are created
- [ ] RLS policies are active (verify: anon key cannot read leads or email_log)
- [ ] `screenshots` storage bucket exists and is configured as public
- [ ] Connection credentials are saved

---

### 0.2 Railway Scan Service Setup

**Goal:** Create a separate Node.js service that runs Lighthouse + axe-core inside a Docker container with headless Chrome.

**Instructions:**

1. Create a new directory for the scan service (this is a separate repo from the portfolio):

```
audit-scan-service/
├── Dockerfile
├── package.json
├── tsconfig.json
├── .env.example
└── src/
    ├── index.ts
    ├── scanner.ts
    ├── issues.ts
    ├── grading.ts
    ├── supabase.ts
    ├── middleware/
    │   └── auth.ts
    └── config/
        ├── lighthouse.ts
        └── issue-mappings.ts
```

2. Create `package.json`:

```json
{
  "name": "audit-scan-service",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node-dev --respawn src/index.ts"
  },
  "dependencies": {
    "@axe-core/puppeteer": "^4.8.0",
    "@supabase/supabase-js": "^2.39.0",
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "lighthouse": "^11.0.0",
    "puppeteer": "^21.0.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/uuid": "^9.0.7",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.3.0"
  }
}
```

3. Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

4. Create `Dockerfile`:

```dockerfile
# Stage 1: Build
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Stage 2: Runtime
FROM node:20-slim

# Install Chromium and dependencies
RUN apt-get update && apt-get install -y \
  chromium \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libgdk-pixbuf2.0-0 \
  libnspr4 \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  xdg-utils \
  --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV CHROME_PATH=/usr/bin/chromium

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3001

CMD ["node", "dist/index.js"]
```

5. Create `.env.example`:

```env
PORT=3001
SCAN_SERVICE_API_KEY=your-shared-secret-here
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CHROME_PATH=/usr/bin/chromium
ALLOWED_ORIGIN=https://danieljoffe.com
```

6. Create `src/config/lighthouse.ts`:

```typescript
export const LIGHTHOUSE_CONFIG: LH.Flags = {
  output: 'json',
  logLevel: 'error',
  onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
  formFactor: 'mobile',
  throttling: {
    cpuSlowdownMultiplier: 4,
    downloadThroughputKbps: 1600,
    uploadThroughputKbps: 750,
    rttMs: 150,
    throughputKbps: 1600,
  },
  screenEmulation: {
    mobile: true,
    width: 375,
    height: 812,
    deviceScaleFactor: 3,
    disabled: false,
  },
  chromeFlags: [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-extensions',
    '--disable-background-networking',
  ],
};

export const LIGHTHOUSE_DESKTOP_CONFIG: LH.Flags = {
  ...LIGHTHOUSE_CONFIG,
  formFactor: 'desktop',
  throttling: {
    cpuSlowdownMultiplier: 1,
    downloadThroughputKbps: 10240,
    uploadThroughputKbps: 10240,
    rttMs: 40,
    throughputKbps: 10240,
  },
  screenEmulation: {
    mobile: false,
    width: 1350,
    height: 940,
    deviceScaleFactor: 1,
    disabled: false,
  },
};
```

7. Create `src/config/issue-mappings.ts`:

```typescript
export interface IssueMapping {
  title: string;
  descriptionTemplate: string;
  impactTemplate: string;
  category: 'performance' | 'accessibility' | 'seo' | 'ux';
  fixDifficulty: 'easy' | 'moderate' | 'complex';
  severity: 'critical' | 'warning' | 'info';
}

// Maps Lighthouse audit IDs to plain-English issues.
// Templates can use {value} as a placeholder for the audit's display value.
// Add more mappings as needed — aim for 30+ for comprehensive reports.

export const LIGHTHOUSE_ISSUE_MAPPINGS: Record<string, IssueMapping> = {
  'largest-contentful-paint': {
    title: 'Main content takes too long to appear',
    descriptionTemplate:
      "Your page's primary content takes {value} to load. Users expect to see meaningful content within 2.5 seconds on mobile.",
    impactTemplate:
      'Pages with LCP over 4 seconds lose up to 25% of visitors before they see your content.',
    category: 'performance',
    fixDifficulty: 'moderate',
    severity: 'critical',
  },
  'first-contentful-paint': {
    title: 'Page is slow to show anything',
    descriptionTemplate:
      'It takes {value} before any content appears on screen. On slower mobile connections, this feels even longer.',
    impactTemplate:
      'Every second of delay in first paint increases bounce probability by 32%.',
    category: 'performance',
    fixDifficulty: 'moderate',
    severity: 'critical',
  },
  'total-blocking-time': {
    title: 'Page freezes during load',
    descriptionTemplate:
      "Your page is unresponsive for {value} while loading. Users can't click, scroll, or interact during this time.",
    impactTemplate:
      'High blocking time makes your site feel broken, especially on mobile devices.',
    category: 'performance',
    fixDifficulty: 'complex',
    severity: 'critical',
  },
  'cumulative-layout-shift': {
    title: 'Content shifts around while loading',
    descriptionTemplate:
      'Elements on your page move unexpectedly as it loads (shift score: {value}). Users may click the wrong thing or lose their place.',
    impactTemplate:
      'Layout shifts frustrate users and directly hurt your Google search ranking.',
    category: 'performance',
    fixDifficulty: 'easy',
    severity: 'warning',
  },
  'speed-index': {
    title: 'Page feels slow to visually complete',
    descriptionTemplate:
      'Your page takes {value} to visually fill the screen. Content loads in chunks rather than appearing smoothly.',
    impactTemplate:
      'A slow speed index makes your site feel sluggish compared to competitors.',
    category: 'performance',
    fixDifficulty: 'moderate',
    severity: 'warning',
  },
  'render-blocking-resources': {
    title: 'Files are blocking your page from loading',
    descriptionTemplate:
      '{value} resources are preventing your page from rendering. The browser must download these before showing anything.',
    impactTemplate:
      'Removing render-blocking resources can shave 1-3 seconds off perceived load time.',
    category: 'performance',
    fixDifficulty: 'moderate',
    severity: 'warning',
  },
  'uses-optimized-images': {
    title: "Images aren't compressed",
    descriptionTemplate:
      'Your images could be {value} smaller without visible quality loss. Uncompressed images are the #1 cause of slow pages.',
    impactTemplate:
      'Compressed images typically reduce page weight by 30-50%, directly improving load time.',
    category: 'performance',
    fixDifficulty: 'easy',
    severity: 'warning',
  },
  'uses-responsive-images': {
    title: 'Mobile users are downloading desktop-sized images',
    descriptionTemplate:
      '{value} could serve appropriately-sized versions for each device. Phone users are downloading images meant for large screens.',
    impactTemplate:
      'Responsive images can reduce mobile data usage by 50%+ and speed up page loads significantly.',
    category: 'performance',
    fixDifficulty: 'easy',
    severity: 'warning',
  },
  'offscreen-images': {
    title: 'Images load before users scroll to them',
    descriptionTemplate:
      '{value} below the fold load immediately instead of waiting until the user scrolls down. This wastes bandwidth and slows the initial page.',
    impactTemplate:
      'Lazy-loading offscreen images can reduce initial page weight by 30-60%.',
    category: 'performance',
    fixDifficulty: 'easy',
    severity: 'warning',
  },
  'uses-text-compression': {
    title: "Text content isn't compressed",
    descriptionTemplate:
      "Your server isn't compressing text-based files. Enabling compression could save {value} of transfer size.",
    impactTemplate:
      'Text compression (gzip/brotli) typically reduces file sizes by 60-80% with minimal server effort.',
    category: 'performance',
    fixDifficulty: 'easy',
    severity: 'warning',
  },
  'unminified-css': {
    title: 'CSS files contain unnecessary whitespace',
    descriptionTemplate:
      'Your CSS files could be {value} smaller by removing comments and whitespace. This is free performance.',
    impactTemplate:
      'Minified CSS loads faster and costs nothing in development effort.',
    category: 'performance',
    fixDifficulty: 'easy',
    severity: 'info',
  },
  'unminified-javascript': {
    title: "JavaScript files aren't minified",
    descriptionTemplate:
      "Your JavaScript could be {value} smaller. Unminified code contains developer comments and formatting that users don't need.",
    impactTemplate:
      'Minified JavaScript loads and parses faster, improving time-to-interactive.',
    category: 'performance',
    fixDifficulty: 'easy',
    severity: 'info',
  },
  'color-contrast': {
    title: 'Some text is hard to read',
    descriptionTemplate:
      "{value} text elements don't have enough contrast against their background. This affects readability for all users, especially those with visual impairments.",
    impactTemplate:
      'Low contrast makes your site unusable for ~15% of the population and violates accessibility standards.',
    category: 'accessibility',
    fixDifficulty: 'easy',
    severity: 'critical',
  },
  'image-alt': {
    title: 'Images are missing descriptions',
    descriptionTemplate:
      "{value} images don't have alt text. Screen readers can't describe these to visually impaired users, and search engines can't understand them.",
    impactTemplate:
      'Missing alt text hurts both accessibility compliance and your SEO ranking.',
    category: 'accessibility',
    fixDifficulty: 'easy',
    severity: 'critical',
  },
  label: {
    title: 'Form fields are missing labels',
    descriptionTemplate:
      "{value} form inputs don't have associated labels. Users relying on screen readers can't tell what information is being requested.",
    impactTemplate:
      'Unlabeled forms are unusable for screen reader users and can confuse all users.',
    category: 'accessibility',
    fixDifficulty: 'easy',
    severity: 'critical',
  },
  'heading-order': {
    title: 'Heading levels are out of order',
    descriptionTemplate:
      'Your page skips heading levels (e.g., jumping from H1 to H3). This breaks the logical outline that screen readers use to navigate.',
    impactTemplate:
      'Proper heading hierarchy helps both accessibility and SEO content structure.',
    category: 'accessibility',
    fixDifficulty: 'easy',
    severity: 'warning',
  },
  'link-name': {
    title: "Links don't describe where they go",
    descriptionTemplate:
      '{value} links lack descriptive text. "Click here" or empty links are meaningless to screen reader users.',
    impactTemplate:
      'Descriptive link text improves navigation for all users and helps SEO.',
    category: 'accessibility',
    fixDifficulty: 'easy',
    severity: 'warning',
  },
  'document-title': {
    title: 'Page is missing a title',
    descriptionTemplate:
      "Your page doesn't have a <title> tag. This is what appears in browser tabs, search results, and social shares.",
    impactTemplate:
      'Missing titles significantly hurt SEO ranking and click-through rates from search results.',
    category: 'seo',
    fixDifficulty: 'easy',
    severity: 'critical',
  },
  'meta-description': {
    title: 'Page is missing a meta description',
    descriptionTemplate:
      "Your page doesn't have a meta description. Search engines display this as the snippet below your page title in results.",
    impactTemplate:
      'Pages with good meta descriptions get up to 5.8% higher click-through rates from search.',
    category: 'seo',
    fixDifficulty: 'easy',
    severity: 'warning',
  },
  viewport: {
    title: "Page isn't configured for mobile",
    descriptionTemplate:
      'Your page is missing a viewport meta tag. Mobile devices will render it at desktop width, making it tiny and unusable.',
    impactTemplate:
      'Without a viewport tag, your site is effectively broken on mobile — where 60%+ of web traffic comes from.',
    category: 'ux',
    fixDifficulty: 'easy',
    severity: 'critical',
  },
  'http-status-code': {
    title: 'Page returns an error',
    descriptionTemplate:
      'Your page returned an unsuccessful HTTP status code. Search engines may not index this page.',
    impactTemplate:
      'Error status codes prevent search engines from indexing your content.',
    category: 'seo',
    fixDifficulty: 'moderate',
    severity: 'critical',
  },
  'is-crawlable': {
    title: "Search engines can't find this page",
    descriptionTemplate:
      "Your page is blocked from search engine crawling. This means it won't appear in Google or other search results.",
    impactTemplate: 'A blocked page is invisible to organic search traffic.',
    category: 'seo',
    fixDifficulty: 'easy',
    severity: 'critical',
  },
};
```

8. Create `src/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
```

9. Create `src/grading.ts`:

```typescript
export interface GradeResult {
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  label: string;
  color: string;
}

export interface CategoryScores {
  performance: number;
  accessibility: number;
  seo: number;
  bestPractices: number;
}

export function calculateGrade(scores: CategoryScores): GradeResult {
  const weighted =
    scores.performance * 0.4 +
    scores.accessibility * 0.25 +
    scores.seo * 0.2 +
    scores.bestPractices * 0.15;

  if (weighted >= 90)
    return { grade: 'A', label: 'Excellent', color: '#63CAA5' };
  if (weighted >= 75) return { grade: 'B', label: 'Good', color: '#8C8FFF' };
  if (weighted >= 60)
    return { grade: 'C', label: 'Needs Work', color: '#FFB46B' };
  if (weighted >= 40) return { grade: 'D', label: 'Poor', color: '#FF8CA0' };
  return { grade: 'F', label: 'Critical', color: '#FF6B6B' };
}
```

10. Create `src/issues.ts`:

```typescript
import {
  LIGHTHOUSE_ISSUE_MAPPINGS,
  IssueMapping,
} from './config/issue-mappings';

export interface ParsedIssue {
  category: 'performance' | 'accessibility' | 'seo' | 'ux';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  impact: string;
  fix_difficulty: 'easy' | 'moderate' | 'complex';
  technical_detail: Record<string, unknown>;
}

export function parseIssues(
  lighthouseResult: any,
  axeResult: any
): ParsedIssue[] {
  const issues: ParsedIssue[] = [];

  // Parse Lighthouse audits
  const audits = lighthouseResult.audits || {};

  for (const [auditId, mapping] of Object.entries(LIGHTHOUSE_ISSUE_MAPPINGS)) {
    const audit = audits[auditId];
    if (!audit) continue;

    // Only include failed/warning audits
    // Lighthouse scores audits 0-1 where 1 = passing
    const score = audit.score;
    if (score === null || score === undefined || score >= 0.9) continue;

    const displayValue = audit.displayValue || '';
    const numericValue = audit.numericValue || 0;

    const description = mapping.descriptionTemplate.replace(
      '{value}',
      displayValue
    );
    const impact = mapping.impactTemplate;

    issues.push({
      category: mapping.category,
      severity: mapping.severity,
      title: mapping.title,
      description,
      impact,
      fix_difficulty: mapping.fixDifficulty,
      technical_detail: {
        auditId,
        score,
        displayValue,
        numericValue,
      },
    });
  }

  // Parse axe-core violations
  const violations = axeResult?.violations || [];

  for (const violation of violations) {
    // Skip if we already captured this via Lighthouse mapping
    const alreadyCaptured = issues.some(i =>
      i.title.toLowerCase().includes(violation.id.replace(/-/g, ' '))
    );
    if (alreadyCaptured) continue;

    const nodeCount = violation.nodes?.length || 0;

    issues.push({
      category: 'accessibility',
      severity:
        violation.impact === 'critical' || violation.impact === 'serious'
          ? 'critical'
          : violation.impact === 'moderate'
            ? 'warning'
            : 'info',
      title: violation.help || violation.id,
      description: `${violation.description}. Found ${nodeCount} instance${nodeCount !== 1 ? 's' : ''} on this page.`,
      impact:
        'Fixing this improves usability for people using assistive technology and may improve your search ranking.',
      fix_difficulty: 'easy',
      technical_detail: {
        axeRuleId: violation.id,
        impact: violation.impact,
        nodeCount,
        helpUrl: violation.helpUrl,
      },
    });
  }

  // Sort: critical first, then warning, then info
  // Within each severity: performance → accessibility → seo → ux
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  const categoryOrder = { performance: 0, accessibility: 1, seo: 2, ux: 3 };

  issues.sort((a, b) => {
    const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return categoryOrder[a.category] - categoryOrder[b.category];
  });

  return issues;
}
```

11. Create `src/scanner.ts`:

```typescript
import lighthouse from 'lighthouse';
import puppeteer from 'puppeteer';
import { AxePuppeteer } from '@axe-core/puppeteer';
import { LIGHTHOUSE_CONFIG } from './config/lighthouse';
import { supabase } from './supabase';

export interface ScanResults {
  lighthouse: any;
  axe: any;
  pageTitle: string;
  pageDescription: string;
  screenshotUrl: string | null;
}

export async function runScan(url: string): Promise<ScanResults> {
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || '/usr/bin/chromium',
    args: [
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      '--disable-background-networking',
    ],
  });

  try {
    // --- Run Lighthouse ---
    const lighthouseResult = await lighthouse(url, {
      ...LIGHTHOUSE_CONFIG,
      port: new URL(browser.wsEndpoint()).port as unknown as number,
    });

    if (!lighthouseResult || !lighthouseResult.lhr) {
      throw new Error('Lighthouse returned no results');
    }

    const lhr = lighthouseResult.lhr;

    // --- Run axe-core ---
    const page = await browser.newPage();
    await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 3 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    const axeResults = await new AxePuppeteer(page).analyze();

    // --- Extract page metadata ---
    const pageTitle = await page.title();
    const pageDescription = await page
      .$eval(
        'meta[name="description"]',
        (el: Element) => (el as HTMLMetaElement).content
      )
      .catch(() => '');

    // --- Take screenshot ---
    const screenshotBuffer = await page.screenshot({
      type: 'jpeg',
      quality: 60,
      fullPage: false,
    });
    // NOTE: Do NOT store base64 in the database — it bloats rows to MBs.
    // Upload to Supabase Storage and store the public URL instead.
    // Ensure a 'screenshots' bucket exists in Supabase Storage (public, or with signed URLs).
    let screenshotUrl: string | null = null;
    try {
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('screenshots')
        .upload(filename, screenshotBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '31536000',
        });
      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage
          .from('screenshots')
          .getPublicUrl(filename);
        screenshotUrl = urlData.publicUrl;
      }
    } catch (e) {
      console.warn('Screenshot upload failed, continuing without screenshot');
    }

    await page.close();

    return {
      lighthouse: lhr,
      axe: axeResults,
      pageTitle,
      pageDescription,
      screenshotUrl,
    };
  } finally {
    await browser.close();
  }
}
```

12. Create `src/middleware/auth.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const apiKey = req.headers['x-api-key'];
  const expectedKey = process.env.SCAN_SERVICE_API_KEY;

  if (!expectedKey) {
    return res
      .status(500)
      .json({ error: 'Server misconfigured: missing API key' });
  }

  if (apiKey !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}
```

13. Create `src/index.ts`:

```typescript
import express from 'express';
import cors from 'cors';
import { authMiddleware } from './middleware/auth';
import { runScan } from './scanner';
import { parseIssues } from './issues';
import { calculateGrade } from './grading';
import { supabase } from './supabase';

const app = express();
const PORT = process.env.PORT || 3001;

// Only allow requests from your own domain
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN || 'https://danieljoffe.com',
  })
);
app.use(express.json());

// Concurrency control — only allow N simultaneous scans
const MAX_CONCURRENT_SCANS = 2;
let activeScans = 0;

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Trigger a scan
app.post('/run-scan', authMiddleware, async (req, res) => {
  const { scan_id, url } = req.body;

  if (!scan_id || !url) {
    return res.status(400).json({ error: 'Missing scan_id or url' });
  }

  if (activeScans >= MAX_CONCURRENT_SCANS) {
    return res.status(503).json({ error: 'Service busy. Try again shortly.' });
  }

  // Respond immediately — scan runs async
  res.json({ status: 'accepted', scan_id });

  activeScans++;

  try {
    // Update status to running
    await supabase
      .from('scans')
      .update({ status: 'running' })
      .eq('id', scan_id);

    // Run the scan with a timeout
    const SCAN_TIMEOUT_MS = 90_000;
    const results = await Promise.race([
      runScan(url),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('Scan timed out after 90s')),
          SCAN_TIMEOUT_MS
        )
      ),
    ]);

    // Parse issues
    const issues = parseIssues(results.lighthouse, results.axe);

    // Calculate scores
    const categories = results.lighthouse.categories;
    const scores = {
      performance: Math.round((categories.performance?.score || 0) * 100),
      accessibility: Math.round((categories.accessibility?.score || 0) * 100),
      seo: Math.round((categories.seo?.score || 0) * 100),
      bestPractices: Math.round(
        (categories['best-practices']?.score || 0) * 100
      ),
    };

    // Calculate grade
    const grade = calculateGrade(scores);

    // Extract Core Web Vitals
    const audits = results.lighthouse.audits;
    const fcp = audits['first-contentful-paint']?.numericValue || null;
    const lcp = audits['largest-contentful-paint']?.numericValue || null;
    const tbt = audits['total-blocking-time']?.numericValue || null;
    const cls = audits['cumulative-layout-shift']?.numericValue || null;
    const si = audits['speed-index']?.numericValue || null;

    // Update scan record
    await supabase
      .from('scans')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        score_performance: scores.performance,
        score_accessibility: scores.accessibility,
        score_best_practices: scores.bestPractices,
        score_seo: scores.seo,
        grade_overall: grade.grade,
        fcp_ms: fcp,
        lcp_ms: lcp,
        tbt_ms: tbt,
        cls: cls,
        si_ms: si,
        page_title: results.pageTitle,
        page_description: results.pageDescription,
        page_screenshot_url: results.screenshotUrl,
        lighthouse_raw: results.lighthouse,
        axe_raw: results.axe,
      })
      .eq('id', scan_id);

    // Insert issues
    if (issues.length > 0) {
      await supabase.from('scan_issues').insert(
        issues.map((issue, index) => ({
          scan_id,
          category: issue.category,
          severity: issue.severity,
          title: issue.title,
          description: issue.description,
          impact: issue.impact,
          fix_difficulty: issue.fix_difficulty,
          technical_detail: issue.technical_detail,
          sort_order: index,
        }))
      );
    }

    console.log(
      `Scan completed: ${scan_id} | Grade: ${grade.grade} | Issues: ${issues.length}`
    );
  } catch (error: any) {
    console.error(`Scan failed: ${scan_id}`, error.message);

    await supabase
      .from('scans')
      .update({
        status: 'failed',
        error_message: error.message,
      })
      .eq('id', scan_id);
  } finally {
    activeScans--;
  }
});

app.listen(PORT, () => {
  console.log(`Scan service running on port ${PORT}`);
});
```

14. Deploy to Railway:
    - Create a new Railway project
    - Connect the repo or deploy via CLI
    - Set environment variables (from `.env.example`)
    - Railway will auto-detect the Dockerfile
    - Note the deployed URL as `SCAN_SERVICE_URL`

**Acceptance Criteria:**

- [ ] Service starts without errors
- [ ] `GET /health` returns `{ status: 'ok' }`
- [ ] `POST /run-scan` without API key returns 401
- [ ] `POST /run-scan` with valid API key and URL returns `{ status: 'accepted' }`
- [ ] `POST /run-scan` returns 503 when max concurrent scans are active
- [ ] Scans that exceed 90 seconds are marked as failed with a timeout error
- [ ] After ~15-30 seconds, the scan record in Supabase updates to `completed` with scores
- [ ] Issues are inserted into `scan_issues` table
- [ ] Screenshot is uploaded to Supabase Storage (not stored as base64 in the row)

---

### 0.3 Next.js Integration Setup

**Goal:** Install dependencies and configure Supabase + Resend clients within the existing portfolio project.

**Instructions:**

1. Install dependencies in the portfolio project:

```bash
npm install @supabase/supabase-js resend @react-email/components
```

2. Create or update `.env.local` with:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_ID=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Resend
RESEND_API_KEY=your-resend-api-key

# Scan Service
SCAN_SERVICE_URL=your-railway-url
SCAN_SERVICE_API_KEY=your-shared-secret

# Admin
AUDIT_ADMIN_PASSWORD=your-admin-password

# Security
IP_HASH_SALT=your-random-salt-string
```

3. Create `lib/supabase/server.ts` (if not already existing):

```typescript
import { createClient } from '@supabase/supabase-js';

export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
```

4. Create `lib/supabase/client.ts` (if not already existing):

```typescript
import { createClient } from '@supabase/supabase-js';

export function createBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_ID!
  );
}
```

5. Create `lib/resend.ts`:

```typescript
import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);
```

6. Create shared type definitions at `types/audit.ts`:

```typescript
export interface Scan {
  id: string;
  url: string;
  normalized_url: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  created_at: string;
  completed_at: string | null;
  error_message: string | null;
  score_performance: number | null;
  score_accessibility: number | null;
  score_best_practices: number | null;
  score_seo: number | null;
  grade_overall: 'A' | 'B' | 'C' | 'D' | 'F' | null;
  fcp_ms: number | null;
  lcp_ms: number | null;
  tbt_ms: number | null;
  cls: number | null;
  si_ms: number | null;
  page_title: string | null;
  page_description: string | null;
  page_screenshot_url: string | null;
  source: string;
}

export interface ScanIssue {
  id: string;
  scan_id: string;
  category: 'performance' | 'accessibility' | 'seo' | 'ux';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  impact: string | null;
  fix_difficulty: 'easy' | 'moderate' | 'complex' | null;
  technical_detail: Record<string, unknown> | null;
  sort_order: number;
}

export interface Lead {
  id: string;
  scan_id: string | null;
  email: string;
  name: string | null;
  company: string | null;
  url_scanned: string | null;
  source: string;
  created_at: string;
  email_sequence_step: number;
  last_email_at: string | null;
}

export interface GradeInfo {
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  label: string;
  color: string;
}

export const GRADE_MAP: Record<string, GradeInfo> = {
  A: { grade: 'A', label: 'Excellent', color: '#63CAA5' },
  B: { grade: 'B', label: 'Good', color: '#8C8FFF' },
  C: { grade: 'C', label: 'Needs Work', color: '#FFB46B' },
  D: { grade: 'D', label: 'Poor', color: '#FF8CA0' },
  F: { grade: 'F', label: 'Critical', color: '#FF6B6B' },
};
```

7. Create URL validation utility at `lib/audit/validation.ts`:

```typescript
export function normalizeUrl(url: string): string {
  let normalized = url.trim().toLowerCase();
  // Add protocol if missing
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized;
  }
  // Remove trailing slash
  normalized = normalized.replace(/\/+$/, '');
  // Remove www
  normalized = normalized.replace(/^(https?:\/\/)www\./, '$1');
  return normalized;
}

export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(normalizeUrl(url));
    // Only allow http and https
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    // Block localhost, internal IPs, and IPv6 loopback
    const hostname = parsed.hostname;
    if (hostname === 'localhost') return false;
    if (hostname === '::1' || hostname === '[::1]') return false;
    if (/^127\./.test(hostname)) return false;
    if (/^192\.168\./.test(hostname)) return false;
    if (/^10\./.test(hostname)) return false;
    if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname)) return false;
    if (hostname === '0.0.0.0') return false;
    // Block link-local and other reserved ranges
    if (/^169\.254\./.test(hostname)) return false;
    if (/^\[?fe80:/i.test(hostname)) return false;
    // Must have a TLD
    if (!hostname.includes('.')) return false;
    return true;
  } catch {
    return false;
  }
  // NOTE: This does not fully prevent SSRF via DNS rebinding. For production
  // hardening, resolve the hostname server-side before passing to the scanner
  // and verify the resolved IP is not in a private range.
}

export function hashIp(ip: string): string {
  // Use a proper one-way hash for IP anonymization
  const { createHash } = require('crypto');
  return createHash('sha256')
    .update(ip + (process.env.IP_HASH_SALT || 'audit-tool'))
    .digest('hex')
    .slice(0, 16);
}
```

**Acceptance Criteria:**

- [ ] Dependencies installed without errors
- [ ] Environment variables configured
- [ ] Supabase client can connect (test with a simple query)
- [ ] Type definitions compile without errors

---

## Phase 1: API Routes

**Goal:** Create the Next.js API endpoints that the frontend will call.

**Dependencies:** Phase 0 complete.

### 1.1 Scan Trigger Endpoint

Create `app/api/audit/scan/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { normalizeUrl, isValidUrl, hashIp } from '@/lib/audit/validation';

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 5; // 5 scans per hour per IP

// NOTE: In-memory rate limiting does NOT work on Vercel (serverless, stateless).
// This implementation uses the scans table itself as the rate limit store.
// For higher traffic, migrate to Vercel KV (Redis) or Upstash.
async function isRateLimited(
  supabase: ReturnType<typeof createServerClient>,
  ipHash: string
): Promise<boolean> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const { count, error } = await supabase
    .from('scans')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', windowStart);

  if (error) {
    console.error('Rate limit check failed:', error);
    return false; // fail open
  }

  return (count ?? 0) >= RATE_LIMIT_MAX;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, source = 'organic' } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    if (!isValidUrl(url)) {
      return NextResponse.json(
        { error: 'Invalid URL. Please enter a valid website address.' },
        { status: 400 }
      );
    }

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const ipHash = hashIp(ip);
    const supabase = createServerClient();

    if (await isRateLimited(supabase, ipHash)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const normalizedUrl = normalizeUrl(url);

    // Check for a recent completed scan of the same URL (within 1 hour)
    // This avoids redundant scans and reduces cost
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentScan } = await supabase
      .from('scans')
      .select('id, status')
      .eq('normalized_url', normalizedUrl)
      .eq('status', 'completed')
      .gte('completed_at', oneHourAgo)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentScan) {
      return NextResponse.json({
        scan_id: recentScan.id,
        status: 'completed',
        cached: true,
      });
    }

    // Create scan record
    const { data: scan, error: insertError } = await supabase
      .from('scans')
      .insert({
        url: normalizedUrl,
        normalized_url: normalizedUrl,
        status: 'pending',
        source,
        ip_hash: ipHash,
      })
      .select('id')
      .single();

    if (insertError || !scan) {
      console.error('Failed to create scan:', insertError);
      return NextResponse.json(
        { error: 'Failed to start scan' },
        { status: 500 }
      );
    }

    // Trigger the scan service (fire and forget)
    fetch(`${process.env.SCAN_SERVICE_URL}/run-scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.SCAN_SERVICE_API_KEY!,
      },
      body: JSON.stringify({
        scan_id: scan.id,
        url: normalizedUrl,
      }),
    }).catch(err => {
      console.error('Failed to trigger scan service:', err);
      // Update scan status to failed
      supabase
        .from('scans')
        .update({ status: 'failed', error_message: 'Scan service unavailable' })
        .eq('id', scan.id);
    });

    return NextResponse.json({ scan_id: scan.id, status: 'pending' });
  } catch (error: any) {
    console.error('Scan endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 1.2 Scan Status Endpoint

Create `app/api/audit/status/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient();

  const { data: scan, error } = await supabase
    .from('scans')
    .select('id, status, error_message, grade_overall')
    .eq('id', params.id)
    .single();

  if (error || !scan) {
    return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: scan.id,
    status: scan.status,
    error_message: scan.error_message,
    grade: scan.grade_overall,
  });
}
```

### 1.3 Report Data Endpoint

Create `app/api/audit/report/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient();

  // Fetch scan
  const { data: scan, error: scanError } = await supabase
    .from('scans')
    .select('*')
    .eq('id', params.id)
    .eq('status', 'completed')
    .single();

  if (scanError || !scan) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  // Fetch issues
  const { data: issues, error: issuesError } = await supabase
    .from('scan_issues')
    .select('*')
    .eq('scan_id', params.id)
    .order('sort_order', { ascending: true });

  if (issuesError) {
    console.error('Failed to fetch issues:', issuesError);
  }

  // Strip raw Lighthouse/axe data from response (too large for client)
  const { lighthouse_raw, axe_raw, ...scanData } = scan;

  return NextResponse.json({
    scan: scanData,
    issues: issues || [],
    summary: {
      totalIssues: issues?.length || 0,
      critical:
        issues?.filter((i: any) => i.severity === 'critical').length || 0,
      warnings:
        issues?.filter((i: any) => i.severity === 'warning').length || 0,
      info: issues?.filter((i: any) => i.severity === 'info').length || 0,
    },
  });
}
```

### 1.4 Lead Capture Endpoint

Create `app/api/leads/capture/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { resend } from '@/lib/resend';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, company, scan_id, source = 'full_report' } = body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get the scan URL for reference
    let urlScanned = null;
    if (scan_id) {
      const { data: scan } = await supabase
        .from('scans')
        .select('url')
        .eq('id', scan_id)
        .single();
      urlScanned = scan?.url || null;
    }

    // Check for existing lead with same email + scan
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id')
      .eq('email', email)
      .eq('scan_id', scan_id)
      .single();

    if (existingLead) {
      return NextResponse.json({
        status: 'already_captured',
        lead_id: existingLead.id,
      });
    }

    // Insert lead
    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        email,
        name,
        company,
        scan_id,
        url_scanned: urlScanned,
        source,
        email_sequence_step: 1,
        last_email_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error || !lead) {
      console.error('Failed to capture lead:', error);
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }

    // Send the full report email immediately
    // TODO: Replace with proper React Email template in Phase 3
    try {
      const reportUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://danieljoffe.com'}/audit/r/${scan_id}`;

      const { data: emailResult } = await resend.emails.send({
        from: 'Daniel Joffe <hello@danieljoffe.com>',
        to: email,
        subject: `Your performance audit for ${urlScanned || 'your site'}`,
        html: `
          <p>Hi${name ? ' ' + name : ''},</p>
          <p>Here's your full performance audit report:</p>
          <p><a href="${reportUrl}">View Your Report</a></p>
          <p>I'll send you a quick win you can implement in 5 minutes in a few days.</p>
          <p>Best,<br/>Daniel Joffe</p>
        `,
      });

      // Log the email
      await supabase.from('email_log').insert({
        lead_id: lead.id,
        template: 'full_report',
        resend_id: emailResult?.id || null,
      });
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      // Don't fail the request — lead is captured even if email fails
    }

    return NextResponse.json({ status: 'captured', lead_id: lead.id });
  } catch (error: any) {
    console.error('Lead capture error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Acceptance Criteria:**

- [ ] `POST /api/audit/scan` creates a scan record and triggers the scan service
- [ ] `POST /api/audit/scan` returns cached result if same URL was scanned within 1 hour
- [ ] `POST /api/audit/scan` with invalid URL returns 400
- [ ] `POST /api/audit/scan` respects rate limiting (persisted, not in-memory)
- [ ] `GET /api/audit/status/[id]` returns current scan status
- [ ] `GET /api/audit/report/[id]` returns scan data + issues for completed scans
- [ ] `POST /api/leads/capture` stores the lead and sends an email
- [ ] `POST /api/leads/capture` rejects malformed email addresses

---

## Phase 2: Frontend — Scan Page & Report Page

**Goal:** Build the user-facing pages for entering a URL, viewing scan progress, and reading the report.

**Dependencies:** Phase 0 and Phase 1 complete.

**Design Requirements:**

- Match the existing portfolio's Deep Teal dark theme (use existing design tokens / CSS variables — do not hardcode hex values)
- Use Inter for body text, Fraunces for display headings
- All color accents should use the grade colors defined in `types/audit.ts` → `GRADE_MAP`
- Mobile-first responsive design
- Animations should be subtle and purposeful (score reveals, progress transitions)
- The report should look like a consultant's deliverable, not a developer tool

### 2.1 Scan Landing Page

Create `app/audit/page.tsx` (or whatever route slug is decided):

This page contains:

- Hero section with headline: "Free website performance audit"
- Subheadline: "Paste your URL. Get a detailed report in 30 seconds."
- URL input field with validation and submit button
- While scanning: replace input with animated progress indicator showing steps
- On completion: redirect to `/audit/r/[scan_id]`
- Below the input: "How it works" section (3 steps: paste URL, get report, fix what matters)
- Social proof line: "X sites audited" (query count from Supabase)

**Component Tree:**

```
ScanPage
├── ScanHero
│   ├── Headline (Fraunces, large)
│   ├── Subheadline (Inter, muted)
│   └── URLInputForm (client component)
│       ├── URLInput (text input with https:// prefix hint)
│       ├── ScanButton ("Audit this site")
│       └── ValidationError (shown on invalid URL)
│
├── ScanProgress (shown during scan, replaces form)
│   ├── ProgressSteps (5 animated steps)
│   │   ├── "Launching browser..." (check after ~2s)
│   │   ├── "Loading your page..." (check after ~5s)
│   │   ├── "Measuring performance..." (check after ~10s)
│   │   ├── "Checking accessibility..." (check after ~15s)
│   │   └── "Generating report..." (check after ~20s)
│   └── ProgressBar (smooth animation)
│
└── HowItWorks
    ├── Step 1: Paste your URL
    ├── Step 2: Get your report
    └── Step 3: Fix what matters
```

**Behavior:**

1. User enters URL and clicks "Audit this site"
2. Client calls `POST /api/audit/scan` with the URL
3. If the response includes `cached: true`, skip the progress animation and redirect directly to `/audit/r/[scan_id]`
4. Otherwise, show `ScanProgress` and start polling `GET /api/audit/status/[id]` every 2 seconds
5. Progress steps animate with checkmarks on a timed sequence (cosmetic — tied to elapsed time, not real progress)
6. When status returns `completed`, redirect to `/audit/r/[scan_id]`
7. If status returns `failed`, show error message with option to retry

### 2.2 Report Page

Create `app/audit/r/[id]/page.tsx`:

This is a server component that fetches the report data and renders the full audit results.

**Component Tree:**

```
ReportPage (server component — fetches data)
├── ReportHeader
│   ├── BackLink ("← New audit")
│   ├── SiteInfo
│   │   ├── Screenshot thumbnail (if available)
│   │   ├── Page title
│   │   ├── URL
│   │   └── Scan date
│   └── OverallGrade
│       ├── Large letter grade (A-F) with grade color
│       ├── Grade label ("Excellent", "Good", etc.)
│       └── Subtitle ("Based on performance, accessibility, SEO, and best practices")
│
├── ScoreCards (4 horizontal cards)
│   ├── ScoreCard: Performance (0-100, color-coded)
│   ├── ScoreCard: Accessibility (0-100, color-coded)
│   ├── ScoreCard: SEO (0-100, color-coded)
│   └── ScoreCard: Best Practices (0-100, color-coded)
│
├── CoreWebVitals
│   ├── Section heading: "Core Web Vitals"
│   ├── MetricRow: First Contentful Paint (value in seconds, pass/fail indicator)
│   ├── MetricRow: Largest Contentful Paint
│   ├── MetricRow: Total Blocking Time
│   ├── MetricRow: Cumulative Layout Shift
│   └── MetricRow: Speed Index
│   (Each row shows: metric name, value, threshold comparison, pass/fail badge)
│
├── PriorityFixes
│   ├── Section heading: "Priority Fixes"
│   ├── Subheading: "The changes that would have the biggest impact"
│   ├── IssueCard #1 (visible) — severity badge, title, description, impact, difficulty
│   ├── IssueCard #2 (visible)
│   ├── IssueCard #3 (visible)
│   ├── BlurredIssueCard #4 (blurred, teaser)
│   ├── BlurredIssueCard #5 (blurred, teaser)
│   └── EmailGate (client component)
│       ├── Prompt: "Unlock X more fixes — enter your email for the full report"
│       ├── EmailInput
│       ├── NameInput (optional)
│       ├── SubmitButton ("Get full report")
│       └── On submit: calls POST /api/leads/capture, then reveals all issues
│
├── AllIssues (shown after email gate unlocked, or initially for direct report links)
│   ├── CategorySection: Performance
│   │   └── IssueCard[] (filtered by category)
│   ├── CategorySection: Accessibility
│   │   └── IssueCard[]
│   ├── CategorySection: SEO
│   │   └── IssueCard[]
│   └── CategorySection: UX
│       └── IssueCard[]
│
├── CostOfInaction
│   ├── Section heading: "What this is costing you"
│   ├── Stat: "Your page takes Xs to load. Y% of mobile users leave after 3s."
│   ├── Stat: "A 1-second improvement can increase conversions by up to 7%"
│   └── Stat: Industry benchmark comparison
│
└── CTASection
    ├── Section heading: "Want these fixed?"
    ├── Subheading: "I specialize in exactly these kinds of problems."
    ├── CalendlyEmbed or CalendlyLink ("Book a free 15-min review")
    ├── OR: "Get a custom fix plan" button → email capture
    └── AuthorCard
        ├── Your name
        ├── Brief one-liner ("Senior frontend engineer specializing in performance optimization")
        └── Link to portfolio
```

**OG Meta Tags** (important for shareable reports):

```typescript
export async function generateMetadata({ params }: { params: { id: string } }) {
  // Fetch scan data for OG tags
  return {
    title: `Performance Audit: ${scan.page_title || scan.url}`,
    description: `This site scored a ${scan.grade_overall}. ${summary.critical} critical issues found.`,
    openGraph: {
      title: `Performance Audit: Grade ${scan.grade_overall}`,
      description: `${summary.totalIssues} issues found. ${summary.critical} critical.`,
    },
  };
}
```

**Acceptance Criteria:**

- [ ] Scan page accepts a URL and shows progress
- [ ] Invalid URLs show validation error
- [ ] Progress animation runs during scan
- [ ] Redirects to report page on completion
- [ ] Shows error state on scan failure
- [ ] Report page displays all scores, grades, Core Web Vitals
- [ ] Top 3 issues visible, rest blurred behind email gate
- [ ] Email gate captures lead and reveals full report
- [ ] CTA section includes Calendly link and author card
- [ ] Report page has OG meta tags for sharing
- [ ] Fully responsive (mobile-first)

---

## Phase 3: Admin Dashboard

**Goal:** Build a password-protected admin page to view scan activity and captured leads.

**Dependencies:** Phase 1 and Phase 2 complete.

Create `app/audit/admin/page.tsx`:

**Auth:** Simple password check. Client component prompts for password, stores in session state. Compare against `AUDIT_ADMIN_PASSWORD` env var via an API route.

**Dashboard Contents:**

- **Stats Row:** Total scans, scans today, total leads, conversion rate (leads / scans)
- **Recent Scans Table:** Date, URL, grade, status, has lead? (sortable, paginated)
- **Leads Table:** Date, email, URL scanned, source, email sequence step (sortable, paginated)
- **Click any scan** → opens report in new tab
- **Click any lead email** → copies to clipboard

**Acceptance Criteria:**

- [ ] Password prompt shown on page load
- [ ] Wrong password shows error, doesn't reveal data
- [ ] Correct password shows dashboard
- [ ] Stats are accurate
- [ ] Both tables load and paginate
- [ ] Clicking scan opens report

---

## Phase 4: Email Templates & Sequence

**Goal:** Create polished email templates using React Email and set up the automated follow-up sequence.

**Dependencies:** Phase 1 complete (lead capture working).

### 4.1 Email Templates

Create email templates using `@react-email/components` in `emails/` directory:

1. `emails/full-report.tsx` — Sent immediately on email capture. Contains: grade summary, top 3 issues, link to full report.
2. `emails/quick-win.tsx` — Sent 3 days later. Contains: the easiest fix from their report with step-by-step instructions.
3. `emails/follow-up.tsx` — Sent 10 days later. Contains: reminder of their grade, brief service pitch, Calendly link.

All emails should:

- Use the same dark theme as the report
- Include Daniel Joffe branding
- Have a clean, professional design
- Include unsubscribe link (required by law)

### 4.2 Unsubscribe Endpoint

Create `app/api/email/unsubscribe/route.ts`:

- Accepts a `lead_id` (or a signed token that encodes the lead_id) via query parameter
- Sets `unsubscribed = true` and `unsubscribed_at = NOW()` on the lead
- Returns a simple HTML page confirming the unsubscription
- All unsubscribe links in email templates should point here

### 4.3 Email Sequence Cron

Create `app/api/email/sequence/route.ts`:

- Runs daily via Vercel Cron (configure in `vercel.json`)
- Queries leads where `unsubscribed = false` and next email is due based on `email_sequence_step` and `last_email_at`
- Step 1 → 2: Send quick-win email after 3 days
- Step 2 → 3: Send follow-up email after 10 days (7 days after step 2)
- Updates `email_sequence_step` and `last_email_at` after each send
- Logs all sends to `email_log` table

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/email/sequence",
      "schedule": "0 17 * * *"
    }
  ]
}
```

**Acceptance Criteria:**

- [ ] All 3 email templates render correctly (test with React Email preview)
- [ ] Full report email sends on lead capture
- [ ] All emails include a working unsubscribe link
- [ ] Unsubscribe endpoint sets `unsubscribed = true` and shows confirmation page
- [ ] Cron job runs daily and sends appropriate emails (skipping unsubscribed leads)
- [ ] Email sequence progresses correctly (step 1 → 2 → 3)
- [ ] Sends are logged in email_log table
- [ ] No duplicate emails sent

---

## Phase 5: Polish & Launch

**Goal:** Final QA, performance optimization, analytics, and deployment.

**Dependencies:** All previous phases complete.

### 5.1 QA Checklist

- [ ] Test scan with 10+ different URLs (fast sites, slow sites, broken sites, redirect URLs)
- [ ] Test error states (invalid URL, scan service down, rate limited)
- [ ] Test email capture flow end-to-end
- [ ] Test report page on mobile (iPhone SE, iPhone 14, Pixel 5)
- [ ] Test report page on desktop (1280px, 1440px, 1920px)
- [ ] Test admin dashboard
- [ ] Verify OG tags render correctly (use https://www.opengraph.xyz/)
- [ ] Check Lighthouse score of the audit tool itself (ironic if it scores poorly)
- [ ] Verify rate limiting works
- [ ] Verify email deliverability (check spam folder)

### 5.2 Analytics Events

Add custom Google Analytics events:

- `audit_scan_started` — when user submits URL
- `audit_scan_completed` — when report loads
- `audit_scan_failed` — when scan fails
- `audit_email_captured` — when lead submits email
- `audit_calendly_clicked` — when CTA is clicked
- `audit_report_shared` — when share/copy link is used

### 5.3 SEO

- Add the audit page to your sitemap
- Create a meta description targeting "free website performance audit" keywords
- Ensure the page title is searchable
- Add structured data (FAQ schema for "How it works" section)

### 5.4 Deployment Checklist

- [ ] All environment variables set in Vercel (including `IP_HASH_SALT`)
- [ ] Scan service deployed and healthy on Railway
- [ ] Supabase tables created with RLS policies
- [ ] Supabase Storage `screenshots` bucket created (public)
- [ ] Resend domain verified
- [ ] Vercel cron configured for email sequence
- [ ] DNS/domain configured if using subdomain
- [ ] Error monitoring in place (Vercel logs at minimum)
- [ ] Unsubscribe endpoint tested end-to-end

---

## Post-Launch (V2 Backlog)

These items are out of scope for MVP but documented for future development:

- [ ] PDF report export
- [ ] Rescan feature (compare before/after)
- [ ] Industry benchmark database
- [ ] Cost of inaction calculator with revenue estimates
- [ ] Blog integration (auto-insights from scan data)
- [ ] Webhook on scan completion (for Zapier/Slack notifications)
- [ ] Public API for programmatic scanning
- [ ] White-label option for agencies
- [ ] Migrate rate limiting to Vercel KV / Upstash for better accuracy under load
- [ ] DNS resolution check (resolve hostname and verify non-private IP before scanning) to fully mitigate SSRF
- [ ] Scan queue (e.g., BullMQ or a Supabase-based FIFO queue) to replace the in-process concurrency guard
- [ ] Proper admin auth (Supabase Auth or NextAuth) to replace the shared password
- [ ] Desktop Lighthouse config option (current MVP only runs mobile)
- [ ] Webhook signature verification on the scan service callback (currently relies solely on the API key header)
