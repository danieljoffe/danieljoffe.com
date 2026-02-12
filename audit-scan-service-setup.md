# Phase 0.2: `audit-scan-service` — Nx Setup Instructions

> **Context:** This document describes how to create the `audit-scan-service` as a proper Nx project inside the existing `danieljoffe.com` monorepo, following Nx best practices. The original execution plan proposed a separate repo — this approach keeps it in the monorepo for shared tooling, caching, and dependency management.

---

## Why Monorepo (Not Separate Repo)

| Concern                                                | Separate Repo             | Monorepo (Nx)                                |
| ------------------------------------------------------ | ------------------------- | -------------------------------------------- |
| Shared types (`Scan`, `ScanIssue`, `Lead`, etc.)       | Copy-paste or npm publish | Direct import from shared lib                |
| Shared validation (`normalizeUrl`, `isValidUrl`, etc.) | Duplicate code            | Direct import from shared lib                |
| Tooling (ESLint, Prettier, TypeScript)                 | Separate configs          | Inherited from workspace                     |
| CI/CD                                                  | Separate pipeline         | `nx affected` only builds/tests what changed |
| Caching                                                | None                      | Nx local + cloud cache                       |
| Docker build                                           | Manual                    | `nx docker-build audit-scan-service`         |

**Verdict:** Keep it in the monorepo. The scan service and the Next.js app share types, validation logic, and DB schema. Nx makes this trivial.

---

## Step-by-Step Plan

### Step 1: Install the `@nx/node` Plugin

The workspace doesn't have `@nx/node` installed yet. Use `nx add` (the recommended way to add Nx plugins — it installs the package and registers any init generators):

```bash
npx nx add @nx/node
```

This will:

- Install `@nx/node` at the same version as your other `@nx/*` packages (22.5.0)
- Run any setup/init generators the plugin provides

---

### Step 2: Generate the Node/Express Application

Use the `@nx/node:application` generator with the Express framework and Docker support:

```bash
npx nx g @nx/node:app apps/audit-scan-service \
  --framework=express \
  --docker \
  --bundler=esbuild \
  --linter=eslint \
  --unitTestRunner=jest \
  --port=3001 \
  --tags="scope:audit,type:app,platform:node"
```

**Flag breakdown:**

| Flag               | Value             | Why                                                                   |
| ------------------ | ----------------- | --------------------------------------------------------------------- |
| `apps/...`         | (positional arg)  | Directory follows existing convention (`apps/root`, `apps/root-e2e`)  |
| `--framework`      | `express`         | Matches the execution plan spec (Express + TypeScript)                |
| `--docker`         | (flag)            | Generates a Dockerfile and auto-installs `@nx/docker` plugin          |
| `--bundler`        | `esbuild`         | Default for Node apps — fast, lightweight, ideal for server bundles   |
| `--linter`         | `eslint`          | Matches existing workspace convention (defaults to `none` otherwise)  |
| `--unitTestRunner` | `jest`            | Matches existing workspace convention (defaults to `none` otherwise)  |
| `--port`           | `3001`            | Avoids conflict with the Next.js dev server on port 3000              |
| `--tags`           | `scope:audit,...` | Sets project tags inline for module boundary enforcement (see Step 5) |

> **Note:** `--e2eTestRunner` defaults to `none` so it doesn't need to be specified.

**What this generates:**

```
apps/audit-scan-service/
├── Dockerfile                  # Multi-stage Docker build (Nx-aware)
├── project.json                # Nx project config (build, serve, test, lint, docker-build targets)
├── tsconfig.json               # TypeScript config (extends workspace root)
├── tsconfig.app.json           # App-specific TS config
├── tsconfig.spec.json          # Test-specific TS config
├── jest.config.ts              # Jest configuration
├── esbuild.config.ts           # esbuild bundler config
├── .env.example                # (we'll create this)
└── src/
    ├── main.ts                 # Express server entrypoint
    └── ...
```

---

### Step 3: Create a Shared Library for Audit Types & Utilities

The scan service and the Next.js app both need the same types (`Scan`, `ScanIssue`, `Lead`) and validation utilities (`normalizeUrl`, `isValidUrl`). Create a shared library:

```bash
npx nx g @nx/js:library libs/shared/audit \
  --importPath=@danieljoffe.com/shared-audit \
  --unitTestRunner=jest \
  --bundler=none \
  --linter=eslint \
  --tags="scope:audit,type:lib,platform:shared"
```

**What this generates:**

```
libs/shared/audit/
├── project.json
├── tsconfig.json
├── tsconfig.lib.json
├── tsconfig.spec.json
├── jest.config.ts
├── src/
│   ├── index.ts               # Public API barrel export
│   └── lib/
│       └── ...                 # Shared code lives here
```

**What goes in this library:**

| File                        | Contents                                                         | Used By      |
| --------------------------- | ---------------------------------------------------------------- | ------------ |
| `src/lib/types.ts`          | `Scan`, `ScanIssue`, `Lead`, `GradeInfo`, `GRADE_MAP` interfaces | Both apps    |
| `src/lib/validation.ts`     | `normalizeUrl()`, `isValidUrl()`, `hashIp()`                     | Both apps    |
| `src/lib/grading.ts`        | `calculateGrade()`, `CategoryScores`                             | Both apps    |
| `src/lib/issue-mappings.ts` | `LIGHTHOUSE_ISSUE_MAPPINGS` record                               | Scan service |
| `src/index.ts`              | Barrel re-exports                                                | —            |

The library would be importable as `@danieljoffe.com/shared-audit` (matching the existing `@danieljoffe.com/shared-ui` convention) via the workspace's `tsconfig.base.json` path alias.

---

### Step 4: Configure the Scan Service Application

After the generator runs, customize the scaffolded app:

#### 4a. Restructure `src/` to Match Execution Plan

```
apps/audit-scan-service/src/
├── main.ts                     # Express server (entrypoint — /health, /run-scan)
├── scanner.ts                  # Puppeteer + Lighthouse + axe-core runner
├── issues.ts                   # Parses raw results into structured issues
├── supabase.ts                 # Supabase client (service role)
├── middleware/
│   └── auth.ts                 # x-api-key validation middleware
└── config/
    └── lighthouse.ts           # Mobile + desktop Lighthouse configs
```

> **Note:** `grading.ts`, `issue-mappings.ts`, `types.ts`, and `validation.ts` move to `libs/shared/audit/` (Step 3). The scan service imports them from `@danieljoffe.com/shared-audit`.

#### 4b. Install Service-Specific Dependencies

These are dependencies unique to the scan service (not needed by the Next.js app):

```bash
yarn add -W puppeteer lighthouse @axe-core/puppeteer @supabase/supabase-js
yarn add -D -W @types/express
```

> **Note:** `express` itself will be installed by the `@nx/node` generator. `@supabase/supabase-js` may already be installed when Phase 0.3 runs — check first.

#### 4c. Create `.env.example`

```
apps/audit-scan-service/.env.example
```

```env
PORT=3001
SCAN_SERVICE_API_KEY=your-shared-secret-here
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CHROME_PATH=/usr/bin/chromium
ALLOWED_ORIGIN=https://danieljoffe.com
```

#### 4d. Customize the Dockerfile

The Nx generator creates a basic `Dockerfile`. We need to customize it because the scan service requires **Chromium** installed in the runtime image. Replace the generated Dockerfile with:

```dockerfile
# Stage 1: Build
FROM docker.io/node:lts-alpine AS builder

WORKDIR /app

# Copy workspace dependency files
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Copy Nx workspace files needed for build
COPY nx.json tsconfig.base.json ./
COPY apps/audit-scan-service/ apps/audit-scan-service/
COPY libs/shared/audit/ libs/shared/audit/

# Build the service using Nx
RUN npx nx build audit-scan-service --configuration=production

# Stage 2: Runtime (needs Chromium for Lighthouse/Puppeteer)
FROM node:20-slim

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
ENV HOST=0.0.0.0
ENV PORT=3001

WORKDIR /app

RUN addgroup --system scanner && \
    adduser --system -G scanner scanner

COPY --from=builder /app/dist/apps/audit-scan-service app/
COPY package.json app/

RUN npm --prefix app --omit=dev -f install

RUN chown -R scanner:scanner .
USER scanner

EXPOSE 3001

CMD ["node", "app/main.js"]
```

---

### Step 5: Verify Project Tags for Module Boundaries

The `--tags` flags in Steps 2 and 3 already set project tags during generation. Verify they appear in the generated `project.json` files:

**`apps/audit-scan-service/project.json`** — should have:

```json
{
  "tags": ["scope:audit", "type:app", "platform:node"]
}
```

**`libs/shared/audit/project.json`** — should have:

```json
{
  "tags": ["scope:audit", "type:lib", "platform:shared"]
}
```

**`apps/root/project.json`** — manually add to existing config:

```json
{
  "tags": ["scope:portfolio", "type:app", "platform:web"]
}
```

This enables future ESLint `@nx/enforce-module-boundaries` rules like:

- `platform:node` apps cannot import from `platform:web` apps
- `type:app` projects cannot import from other `type:app` projects
- Only `scope:audit` projects can import from `scope:audit` libs

---

### Step 6: Verify Everything Works

Run these commands to validate the setup:

```bash
# Build the scan service
npx nx build audit-scan-service

# Run unit tests
npx nx test audit-scan-service

# Lint
npx nx lint audit-scan-service

# Build Docker image locally
docker build -f apps/audit-scan-service/Dockerfile -t audit-scan-service .

# Run the Docker container on the postgres-net network
docker run -d \
  --name audit-scan-service \
  --network postgres-net \
  -p 3001:3001 \
  -e PORT=3001 \
  -e SCAN_SERVICE_API_KEY=dev-key \
  -e SUPABASE_URL=http://placeholder \
  -e SUPABASE_SERVICE_ROLE_KEY=placeholder \
  -e CHROME_PATH=/usr/bin/chromium \
  -e ALLOWED_ORIGIN=http://localhost:3000 \
  audit-scan-service

# Health check
curl http://localhost:3001/health
```

---

### Step 7: Update Workspace Configuration

#### 7a. Add to `package.json` workspaces (if needed)

The existing workspaces pattern `"apps/*"` already covers `apps/audit-scan-service`, so no change needed.

#### 7b. Verify `tsconfig.base.json` path alias

After generating the shared library, verify the path alias was added:

```json
{
  "compilerOptions": {
    "paths": {
      "@danieljoffe.com/shared-audit": ["libs/shared/audit/src/index.ts"]
    }
  }
}
```

---

## Final Project Structure

After all steps, the workspace looks like:

```
danieljoffe.com/
├── apps/
│   ├── root/                       # Next.js portfolio (existing)
│   ├── root-e2e/                   # Playwright E2E tests (existing)
│   └── audit-scan-service/         # NEW — Express scan service
│       ├── Dockerfile
│       ├── project.json
│       ├── esbuild.config.ts
│       ├── jest.config.ts
│       ├── tsconfig.json
│       ├── tsconfig.app.json
│       ├── tsconfig.spec.json
│       ├── .env.example
│       └── src/
│           ├── main.ts
│           ├── scanner.ts
│           ├── issues.ts
│           ├── supabase.ts
│           ├── middleware/
│           │   └── auth.ts
│           └── config/
│               └── lighthouse.ts
├── libs/
│   ├── shared/
│   │   ├── ui/                     # Shared UI components (existing)
│   │   └── audit/                  # NEW — Shared audit types & utils
│   │       ├── project.json
│   │       └── src/
│   │           ├── index.ts
│   │           └── lib/
│   │               ├── types.ts
│   │               ├── validation.ts
│   │               ├── grading.ts
│   │               └── issue-mappings.ts
│   └── apps/                       # (existing)
└── ...
```

---

## Nx Targets Available After Setup

| Command                                  | What It Does                                                                |
| ---------------------------------------- | --------------------------------------------------------------------------- |
| `npx nx build audit-scan-service`        | Compiles TypeScript via esbuild, outputs to `dist/apps/audit-scan-service/` |
| `npx nx serve audit-scan-service`        | Runs the dev server with file watching                                      |
| `npx nx test audit-scan-service`         | Runs Jest unit tests                                                        |
| `npx nx lint audit-scan-service`         | Runs ESLint                                                                 |
| `npx nx docker-build audit-scan-service` | Builds Docker image (if target configured)                                  |
| `npx nx graph`                           | Visualize project dependency graph (scan service → shared-audit ← root)     |
| `npx nx affected -t build test lint`     | Only builds/tests projects affected by your changes                         |

---

## Acceptance Criteria

- [ ] `@nx/node` plugin installed
- [ ] `audit-scan-service` project generated at `apps/audit-scan-service/`
- [ ] `shared-audit` library generated at `libs/shared/audit/`
- [ ] Shared types, validation, grading, and issue-mappings in the shared lib
- [ ] Scan service imports from `@danieljoffe.com/shared-audit`
- [ ] `npx nx build audit-scan-service` succeeds
- [ ] `npx nx test audit-scan-service` passes
- [ ] `npx nx lint audit-scan-service` passes
- [ ] Docker image builds successfully
- [ ] `GET /health` returns `{ status: 'ok' }` from the container
- [ ] `npx nx graph` shows the correct dependency: `audit-scan-service → shared-audit ← root`
- [ ] Project tags set for future module boundary enforcement
