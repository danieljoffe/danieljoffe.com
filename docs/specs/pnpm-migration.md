# Migration Spec: Yarn Classic to pnpm

> Spec for `danieljoffe.com` monorepo | April 2026
> Based on research in [`docs/research/package-manager-comparison.md`](../research/package-manager-comparison.md)

## Why Migrate

- **Yarn Classic (v1.22.22) is dying** — maintenance mode since 2020, possible removal from Node.js 26 (April 2026)
- **pnpm is 7x faster** — CI installs drop from ~35s to ~14s for monorepo-scale projects
- **Strict dependency resolution** — catches phantom dependencies (packages used but never declared) that silently break in production
- **Content-addressable store** — shared global store means packages are stored once on disk, not duplicated per project
- **First-class Nx + Vercel support** — Vercel uses pnpm internally; Nx has dedicated pnpm workspace guides

---

## Prerequisites

- Node.js 24.x (already satisfied — `.nvmrc`: v24.11.0)
- pnpm v10 installed via Corepack:
  ```bash
  corepack enable
  corepack prepare pnpm@latest --activate
  ```

---

## Step 1: Create pnpm Workspace Config

**Create `pnpm-workspace.yaml`** (new file):

```yaml
packages:
  - 'apps/*'
  - 'libs/*'
  - 'libs/shared/*'
```

This replaces the `"workspaces"` field in `package.json`.

---

## Step 2: Create `.npmrc` (Sentry Hoisting)

**Create `.npmrc`** (new file):

```ini
public-hoist-pattern[]=@sentry/*
public-hoist-pattern[]=*import-in-the-middle*
```

**Why:** Sentry's module interception (`import-in-the-middle`) relies on hoisted packages to intercept imports at runtime. pnpm's strict `node_modules` isolates these, breaking Sentry's instrumentation. These hoist patterns expose only the necessary packages to the root.

**Risk: MEDIUM-HIGH** — this is the most likely source of migration issues. If builds fail with `sentryWebpackPlugin` or `@sentry/utils` resolution errors, additional hoist patterns may be needed.

References:

- [sentry-javascript#10306](https://github.com/getsentry/sentry-javascript/issues/10306) — `@sentry/utils` not found with Nx + pnpm
- [sentry-javascript#14946](https://github.com/getsentry/sentry-javascript/issues/14946) — Sentry Feedback broken in pnpm monorepo

---

## Step 3: Update Root `package.json`

### 3a. Add `packageManager` field

```diff
 {
   "name": "@danieljoffe.com/source",
   "version": "0.0.0",
   "license": "MIT",
+  "packageManager": "pnpm@10.x.x",
   "engines": {
     "node": "24.x"
   },
```

> Replace `10.x.x` with the exact pnpm version installed (`pnpm --version`).

### 3b. Update `pom` script

```diff
-    "pom": "yarn typecheck && yarn lint:fix && yarn format && yarn test && yarn test:coverage && yarn test:e2e && yarn test:lighthouse",
+    "pom": "pnpm typecheck && pnpm lint:fix && pnpm format && pnpm test && pnpm test:coverage && pnpm test:e2e && pnpm test:lighthouse",
```

### 3c. Remove `workspaces` field

```diff
-  "workspaces": [
-    "apps/*",
-    "libs/*",
-    "libs/shared/*"
-  ],
```

pnpm reads workspace definitions from `pnpm-workspace.yaml` (Step 1).

### 3d. Convert `resolutions` to `pnpm.overrides`

```diff
-  "resolutions": {
-    "axios": "1.13.6",
-    "tmp": "^0.2.4",
-    "@opentelemetry/core": "2.6.0",
-    "@opentelemetry/resources": "2.6.0",
-    "@opentelemetry/sdk-trace-base": "2.6.0",
-    "@typescript-eslint/utils": "8.56.1",
-    "@typescript-eslint/type-utils": "8.56.1",
-    "@typescript-eslint/eslint-plugin": "8.56.1",
-    "@typescript-eslint/parser": "8.56.1",
-    "@typescript-eslint/types": "8.56.1",
-    "@typescript-eslint/typescript-estree": "8.56.1",
-    "@typescript-eslint/visitor-keys": "8.56.1",
-    "@typescript-eslint/scope-manager": "8.56.1"
-  },
+  "pnpm": {
+    "overrides": {
+      "axios": "1.13.6",
+      "tmp": "^0.2.4",
+      "@opentelemetry/core": "2.6.0",
+      "@opentelemetry/resources": "2.6.0",
+      "@opentelemetry/sdk-trace-base": "2.6.0",
+      "@typescript-eslint/utils": "8.56.1",
+      "@typescript-eslint/type-utils": "8.56.1",
+      "@typescript-eslint/eslint-plugin": "8.56.1",
+      "@typescript-eslint/parser": "8.56.1",
+      "@typescript-eslint/types": "8.56.1",
+      "@typescript-eslint/typescript-estree": "8.56.1",
+      "@typescript-eslint/visitor-keys": "8.56.1",
+      "@typescript-eslint/scope-manager": "8.56.1"
+    }
+  },
```

pnpm uses `pnpm.overrides` — same semantics as Yarn's `resolutions` for flat overrides.

---

## Step 4: Lockfile Migration

```bash
pnpm import                    # Reads yarn.lock, generates pnpm-lock.yaml
rm yarn.lock                   # Remove old lockfile
rm -rf node_modules            # Clean all node_modules
pnpm install                   # Full clean install with strict resolution
```

**Expected output:** `pnpm-lock.yaml` generated. Any phantom dependency errors surface here — fix by adding missing packages to `devDependencies` or adding hoist patterns to `.npmrc`.

---

## Step 5: CI/CD Changes

### 5a. `.github/actions/ci/action.yml`

```diff
 runs:
   using: composite
   steps:
+    - uses: pnpm/action-setup@v4
+
     - uses: actions/setup-node@v5
       with:
         node-version-file: .nvmrc
-        cache: yarn
+        cache: pnpm

     - name: Install dependencies
       shell: bash
-      run: yarn install --frozen-lockfile
+      run: pnpm install --frozen-lockfile

     - uses: nrwl/nx-set-shas@v5

     - name: Run affected tasks
       shell: bash
-      run: yarn nx affected -t lint test build typecheck build-storybook --nxBail
+      run: pnpm nx affected -t lint test build typecheck build-storybook --nxBail

     - name: Install Playwright
       if: ${{ inputs.run-e2e == 'true' }}
       shell: bash
-      run: yarn playwright install --with-deps chromium
+      run: pnpm exec playwright install --with-deps chromium

     - name: Run e2e tests
       if: ${{ inputs.run-e2e == 'true' }}
       shell: bash
-      run: yarn nx affected -t e2e --nxBail
+      run: pnpm nx affected -t e2e --nxBail

     - name: Run Chromatic visual tests
       if: ${{ inputs.chromatic-project-token != '' }}
       shell: bash
-      run: yarn chromatic:ui --exit-zero-on-changes --exit-once-sent
+      run: pnpm chromatic:ui --exit-zero-on-changes --exit-once-sent

     - name: Run Lighthouse CI
       if: ${{ inputs.run-e2e == 'true' }}
       shell: bash
-      run: yarn test:lighthouse
+      run: pnpm test:lighthouse
```

### 5b. `.github/workflows/ci.yml` (update-snapshots job)

```diff
       - name: Install Playwright browsers
-        run: yarn playwright install --with-deps chromium
+        run: pnpm exec playwright install --with-deps chromium

       - name: Build app for snapshot generation
-        run: yarn nx build root
+        run: pnpm nx build root

       - name: Regenerate VR snapshots
         working-directory: apps/root-e2e
-        run: npx playwright test src/visual-regression.spec.ts --update-snapshots --project=chromium
+        run: pnpm exec playwright test src/visual-regression.spec.ts --update-snapshots --project=chromium
```

> Note: The `update-snapshots` job also uses `./.github/actions/ci` (which is updated in 5a), so it inherits pnpm setup from there. But the standalone steps in lines 63-71 need direct updates. A `pnpm/action-setup@v4` step should be added to the `update-snapshots` job as well, before the `actions/checkout` step or after it (before the ci action is invoked).

### 5c. `.github/actions/vercel-deploy/action.yml`

```diff
   steps:
+    - uses: pnpm/action-setup@v4
+
     - uses: actions/setup-node@v5
       with:
         node-version-file: .nvmrc
-        cache: yarn
+        cache: pnpm
```

> This action only runs `npm i -g vercel` and `vercel` commands — no `yarn install` call. The cache change ensures the right lockfile is used for caching.

### 5d. `.github/actions/vercel-deploy-storybook/action.yml`

```diff
   steps:
+    - uses: pnpm/action-setup@v4
+
     - uses: actions/setup-node@v5
       with:
         node-version-file: .nvmrc
-        cache: yarn
+        cache: pnpm

     - name: Install dependencies
       shell: bash
-      run: yarn install --frozen-lockfile
+      run: pnpm install --frozen-lockfile

     - name: Build Storybook
       shell: bash
-      run: yarn nx build-storybook @danieljoffe/shared-ui
+      run: pnpm nx build-storybook @danieljoffe/shared-ui
```

---

## Step 6: Docker Changes

**`apps/audit-scan-service/Dockerfile`**:

```diff
-# Build the docker image with `npx nx docker:build @danieljoffe.com/audit-scan-service`.
+# Build the docker image with `pnpm exec nx docker:build @danieljoffe.com/audit-scan-service`.

 # Stage 1: Build
 FROM docker.io/node:lts-alpine AS builder

+RUN corepack enable && corepack prepare pnpm@latest --activate
+
 WORKDIR /app

 # Copy workspace root files needed for install + build
-COPY package.json yarn.lock ./
+COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
 COPY apps/audit-scan-service/package.json apps/audit-scan-service/package.json
 COPY libs/shared/audit/package.json libs/shared/audit/package.json

-RUN yarn install --frozen-lockfile
+RUN pnpm install --frozen-lockfile

 # Copy source code
 COPY nx.json tsconfig.base.json ./
 COPY apps/audit-scan-service apps/audit-scan-service
 COPY libs/shared/audit libs/shared/audit

-RUN npx nx build audit-scan-service --configuration=production
+RUN pnpm exec nx build audit-scan-service --configuration=production
```

> The runtime stage (`RUN npm install --omit=dev`) is kept as-is — it uses the pruned `package.json` output from the build and doesn't need pnpm.

---

## Step 7: Nx Config Changes

**`apps/audit-scan-service/package.json`** (line 54):

```diff
         "outputs": [
           "{workspaceRoot}/apps/audit-scan-service/dist/package.json",
-          "{workspaceRoot}/apps/audit-scan-service/dist/yarn.lock"
+          "{workspaceRoot}/apps/audit-scan-service/dist/pnpm-lock.yaml"
         ],
```

---

## Step 8: Husky Hook

**`.husky/pre-commit`**:

```diff
-npx lint-staged
+pnpm exec lint-staged

 # Run type checking when TypeScript files are staged
 if git diff --cached --name-only --diff-filter=ACMR | grep -qE '\.(ts|tsx)$'; then
   echo "TypeScript files changed — running type check..."
-  yarn typecheck
+  pnpm typecheck
 fi
```

---

## Step 9: Ignore Files

**`.prettierignore`** (line 154):

```diff
-yarn.lock
+pnpm-lock.yaml
```

Lines 78-79 (`yarn-debug.log*`, `yarn-error.log*`) and line 120 (`.yarn-integrity`) — keep as-is. They're harmless and prevent issues if anyone accidentally runs yarn.

**`.gitignore`** — no changes needed. `pnpm-lock.yaml` should be committed (not ignored).

---

## Step 10: Documentation Updates

### `CLAUDE.md`

Update command examples throughout. Key changes:

| Section            | Before                              | After                           |
| ------------------ | ----------------------------------- | ------------------------------- |
| Pre-Push Checklist | `yarn tsc --noEmit`                 | `pnpm tsc --noEmit`             |
| Pre-Push Checklist | `yarn nx test root`                 | `pnpm nx test root`             |
| Development        | `npx nx dev root`                   | `pnpm nx dev root`              |
| Development        | `npx nx build root`                 | `pnpm nx build root`            |
| Development        | `npx nx start root`                 | `pnpm nx start root`            |
| Testing            | `npx nx test root`                  | `pnpm nx test root`             |
| Testing            | `npx nx e2e root-e2e`               | `pnpm nx e2e root-e2e`          |
| Testing            | `npx playwright test ...`           | `pnpm exec playwright test ...` |
| Testing            | `yarn test:coverage`                | `pnpm test:coverage`            |
| Testing            | `yarn test:lighthouse`              | `pnpm test:lighthouse`          |
| Linting            | `yarn lint`                         | `pnpm lint`                     |
| Linting            | `yarn lint:fix`                     | `pnpm lint:fix`                 |
| Linting            | `yarn format`                       | `pnpm format`                   |
| Linting            | `yarn typecheck`                    | `pnpm typecheck`                |
| Storybook          | `npx nx storybook root`             | `pnpm nx storybook root`        |
| Nx guidance        | `pnpm nx build`, `npm exec nx test` | `pnpm nx build`, `pnpm nx test` |

Also update the "Project Overview" section to reference pnpm instead of Yarn workspaces.

### `README.md`

- Update "Package Manager: Yarn" reference to "Package Manager: pnpm"
- Update `yarn install` -> `pnpm install`
- Update `yarn storybook` -> `pnpm storybook`
- Update all `npx nx` -> `pnpm nx` command examples

### `TESTING.md`

- Update all `yarn test`, `yarn test:coverage`, `yarn test:e2e`, `yarn test:lighthouse` commands
- Update all `yarn lint`, `yarn lint:fix` commands

### `libs/shared/ui/README.md`

- Update `npx nx test @danieljoffe/shared-ui` -> `pnpm nx test @danieljoffe/shared-ui`

---

## Step 11: Skill Files

Update package manager detection logic in these 4 files:

- `.opencode/skills/monitor-ci/SKILL.md` — change `yarn.lock` -> `pnpm-lock.yaml` and `yarn nx` -> `pnpm nx`
- `.opencode/skills/link-workspace-packages/SKILL.md` — update yarn references
- `.github/skills/monitor-ci/SKILL.md` — same as above
- `.github/skills/link-workspace-packages/SKILL.md` — same as above

---

## CLI Command Reference

Quick reference for anyone used to Yarn Classic commands:

| Yarn Classic                      | pnpm Equivalent                                                  |
| --------------------------------- | ---------------------------------------------------------------- |
| `yarn install`                    | `pnpm install`                                                   |
| `yarn install --frozen-lockfile`  | `pnpm install --frozen-lockfile`                                 |
| `yarn add <pkg>`                  | `pnpm add <pkg>`                                                 |
| `yarn add -D <pkg>`               | `pnpm add -D <pkg>`                                              |
| `yarn remove <pkg>`               | `pnpm remove <pkg>`                                              |
| `yarn <script>`                   | `pnpm <script>`                                                  |
| `yarn workspace <name> add <pkg>` | `pnpm --filter <name> add <pkg>`                                 |
| `npx <cmd>`                       | `pnpm exec <cmd>` (project binary) or `pnpm dlx <cmd>` (one-off) |
| `yarn global add <pkg>`           | `pnpm add -g <pkg>`                                              |
| `yarn upgrade`                    | `pnpm update`                                                    |
| `yarn audit`                      | `pnpm audit`                                                     |
| `yarn why <pkg>`                  | `pnpm why <pkg>`                                                 |

---

## Files Changed Summary

| Category          | Files                                                                                                                                                         | Risk   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| **New files**     | `pnpm-workspace.yaml`, `.npmrc`                                                                                                                               | Low    |
| **Deleted files** | `yarn.lock` (replaced by `pnpm-lock.yaml`)                                                                                                                    | Low    |
| **CI/CD**         | `.github/actions/ci/action.yml`, `.github/workflows/ci.yml`, `.github/actions/vercel-deploy/action.yml`, `.github/actions/vercel-deploy-storybook/action.yml` | Low    |
| **Docker**        | `apps/audit-scan-service/Dockerfile`                                                                                                                          | Medium |
| **Config**        | `package.json` (root), `apps/audit-scan-service/package.json`                                                                                                 | Low    |
| **Hooks**         | `.husky/pre-commit`                                                                                                                                           | Low    |
| **Ignore**        | `.prettierignore`                                                                                                                                             | Low    |
| **Docs**          | `CLAUDE.md`, `README.md`, `TESTING.md`, `libs/shared/ui/README.md`                                                                                            | Low    |
| **Skills**        | 4 skill markdown files                                                                                                                                        | Low    |
| **Total**         | **~20 files**                                                                                                                                                 |        |

---

## Verification Plan

### Phase 1: Local (blocks all subsequent phases)

```bash
pnpm install                              # Clean install succeeds
pnpm tsc --noEmit                         # Zero type errors
pnpm nx test root                         # All unit tests pass
pnpm nx dev root                          # Dev server starts at localhost:3000
pnpm nx build root                        # Production build succeeds
pnpm nx storybook root                    # Storybook launches
```

### Phase 2: Sentry (highest risk)

- Start dev server, open browser console — confirm Sentry DSN initializes
- Run `pnpm nx build root` — verify no `sentryWebpackPlugin` / `@sentry/utils` errors
- If issues: add more patterns to `.npmrc` (`public-hoist-pattern[]=@opentelemetry/*`, etc.)

### Phase 3: E2E

```bash
pnpm exec playwright install --with-deps chromium
pnpm nx e2e root-e2e                      # All E2E tests pass
```

### Phase 4: Docker

```bash
pnpm exec nx docker:build @danieljoffe.com/audit-scan-service
docker run -p 3001:3001 audit-scan-service
```

### Phase 5: CI

- Push to feature branch
- Verify GitHub Actions CI passes (lint, test, build, typecheck, e2e)
- Verify Vercel preview deploy works
- Verify Chromatic visual tests run

---

## Rollback Strategy

If the migration fails at any stage:

```bash
git revert <migration-commit>             # Restores yarn.lock and all files
rm -rf node_modules
yarn install --frozen-lockfile             # Back to Yarn Classic
git push
```

The migration is **fully git-reversible**. No infrastructure, environment variables, or external service changes are required — only file changes within the repo.

---

## Estimated Effort

| Phase                                  | Time          | Notes                                                    |
| -------------------------------------- | ------------- | -------------------------------------------------------- |
| File changes (Steps 1-11)              | 1-2 hours     | Mostly mechanical find-and-replace                       |
| Lockfile migration + phantom dep fixes | 30-60 min     | `pnpm import` + fix any strict resolution errors         |
| Sentry debugging                       | 0-2 hours     | Depends on whether initial hoist patterns are sufficient |
| Local verification                     | 30 min        | Run through all Phase 1-4 checks                         |
| CI verification                        | 30 min        | Push and watch pipeline                                  |
| **Total**                              | **3-6 hours** | Sentry is the wildcard                                   |
