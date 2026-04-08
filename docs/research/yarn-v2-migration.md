# Yarn v2+ (Berry) Migration Research

> Research compiled April 2026 for `danieljoffe.com` monorepo

## Current State

| Aspect | Value |
|---|---|
| Yarn version | 1.22.22 (Classic) |
| Lock file | `yarn.lock` v1 (19,789 lines) |
| Node.js | 24.x (`.nvmrc`: v24.11.0) |
| Monorepo tool | Nx 22.5.4 |
| Workspaces | `apps/*`, `libs/*`, `libs/shared/*` |
| Config files | None (`.yarnrc` / `.yarnrc.yml` do not exist) |
| PnP | Not used (standard hoisted `node_modules`) |
| CI | GitHub Actions with `yarn install --frozen-lockfile` |
| Deployment | Vercel (with Corepack detection) |
| Docker | `apps/audit-scan-service/Dockerfile` uses `yarn install --frozen-lockfile` |

---

## 1. Pros of Migrating

### Deterministic Installs & Strictness
- Yarn Berry enforces strict dependency declarations. Packages cannot silently depend on hoisted transitive dependencies ("phantom dependencies"), catching real bugs before production.
- The new lockfile format (`yarn.lock` v2) is YAML-based and more merge-friendly in Git.

### Installation Strategy Flexibility
- Berry supports three `nodeLinker` modes: **PnP** (default), **node-modules** (drop-in compatible), and **pnpm-style content-addressed** storage. You can start with `nodeLinker: node-modules` and optionally migrate to PnP later.

### Performance (with PnP)
- PnP cold installs benchmarked at ~3.6s in some tests (vs. ~52s for Yarn node-modules mode).
- Zero-installs eliminates `yarn install` entirely in CI by committing the `.yarn/cache` folder.

### Modern Tooling
- Built-in `yarn dlx` (replaces `npx` for one-off commands).
- Built-in `yarn patch` for patching dependencies inline without `patch-package`.
- Constraints engine for enforcing workspace-wide rules (e.g., all packages must use the same React version).
- `yarn dedupe` for intelligent deduplication.
- Plugin architecture for extensibility.

### Active Development
- Yarn Classic (v1) is in **maintenance mode** — no new features, only critical fixes. Yarn 4.x is the actively developed line.
- Corepack integration means the correct Yarn version is pinned via `packageManager` in `package.json` and auto-installed, eliminating "works on my machine" version drift.

### Better Monorepo Features
- `yarn workspaces foreach` for running commands across workspaces.
- `yarn workspaces focus` for installing only a subset of workspaces (useful for Docker builds).
- Better workspace protocol support (`workspace:*`).

---

## 2. Cons & Risks

### Ecosystem Compatibility (PnP Mode)
- ~15% of npm packages are PnP-incompatible according to 2026 estimates. This requires `packageExtensions` workarounds in `.yarnrc.yml`.
- **Storybook + PnP**: Long history of issues ([#19764](https://github.com/storybookjs/storybook/issues/19764), [#27094](https://github.com/storybookjs/storybook/issues/27094), [#31237](https://github.com/storybookjs/storybook/issues/31237)). Module resolution failures with `@storybook/addon-essentials` and Yarn 4 PnP specifically.
- **Sentry + PnP**: `sentry-cli` install script fails in PnP ([#1204](https://github.com/getsentry/sentry-cli/issues/1204)). `@sentry/nextjs` build fails in PnP mode ([#13641](https://github.com/getsentry/sentry-javascript/issues/13641)). SSR failures reported on deployment platforms ([#5107](https://github.com/getsentry/sentry-javascript/issues/5107)).
- **Next.js Turbopack + PnP**: Turbopack cannot resolve `next` without `node_modules` ([#74648](https://github.com/vercel/next.js/issues/74648)). Fatal errors with Yarn 4.6.0 + Next.js 15.1.4 + Turbopack.

### Migration Effort
- All CI/CD scripts must be updated (`--frozen-lockfile` becomes `--immutable`).
- Docker builds need updating for the new CLI and lock file.
- Custom `pre`/`post` lifecycle scripts no longer auto-run — must be inlined (your `prepare: "husky"` script is fine as it's a standard lifecycle hook, but any custom pre/post scripts would need changes).
- `.npmrc` / `.yarnrc` configs must be converted to `.yarnrc.yml`.
- The `resolutions` field in `package.json` still works but is now also supported as `resolutions` in `.yarnrc.yml`.
- `yarn global` is removed — replaced by `yarn dlx`.

### Vercel Deployment Complexity
- Vercel supports Yarn Berry via Corepack (`ENABLE_EXPERIMENTAL_COREPACK=1` env var + `packageManager` field).
- Reports of Vercel forcing `nodeLinker: node-modules` during builds, which can cause subtle breakage if your local dev uses PnP ([Discussion #4223](https://github.com/vercel/vercel/discussions/4223)).
- PnP mode is not reliably supported on Vercel — `node-modules` linker is the safe choice for Vercel deployments.

### Learning Curve
- Different mental model for dependency resolution (especially PnP).
- New CLI commands and flags to learn.
- Debugging dependency issues requires understanding PnP's resolution algorithm.

### Zero-Installs Trade-offs
- Committing `.yarn/cache` can balloon Git repo size. With 250MB of deps and 20 updates over project lifetime, clone size grows to ~5GB.
- Mitigation: Git partial clones (`--filter=blob:limit=2m`), but this adds complexity.
- Most teams skip zero-installs and just use the faster install times.

---

## 3. Technology Compatibility Matrix

| Technology | node-modules mode | PnP mode | Notes |
|---|---|---|---|
| **Next.js 16** | Works | Partial | Turbopack incompatible with PnP. Webpack mode works with caveats. |
| **React 19** | Works | Works | No known issues. |
| **TypeScript** | Works | Works | Requires `@yarnpkg/sdks` for IDE support in PnP. |
| **Tailwind CSS 4** | Works | Works | No known issues. |
| **Nx 22** | Works | Partial | Some Nx recipes/generators may break with PnP. Path alias issues reported ([berry#5653](https://github.com/yarnpkg/berry/issues/5653)). `node-modules` mode recommended. |
| **Sentry** | Works | Broken | `sentry-cli` and `@sentry/nextjs` have documented PnP failures. **Blocker for PnP.** |
| **Storybook** | Works | Broken | Persistent PnP issues across Storybook 7, 8, and 9. **Blocker for PnP.** |
| **GSAP** | Works | Works | GSAP moved to public npm (no more private registry). No PnP-specific issues. |
| **Playwright** | Works | Likely works | Browser install via `yarn playwright install` works. No documented PnP blockers. |
| **Jest** | Works | Works | Requires `@yarnpkg/sdks` for proper resolution in PnP. |
| **ESLint + Prettier** | Works | Works | Requires SDK setup for PnP. |
| **Husky + lint-staged** | Works | Works | Modern versions compatible. Install at workspace root. |
| **react-hook-form + yup** | Works | Works | No known issues. |
| **Vercel** | Works | Unreliable | Vercel may override PnP to `node-modules`. Use `node-modules` mode. |
| **GitHub Actions** | Works | Works | Update `--frozen-lockfile` to `--immutable`. Corepack setup needed. |
| **Docker** | Works | Works | Update Dockerfile commands. PnP Docker builds are more complex. |

---

## 4. Recommendation

### Use `nodeLinker: node-modules` (not PnP)

Given this project's stack, **PnP is not viable** due to hard blockers:
- Sentry (`@sentry/nextjs`) build failures in PnP
- Storybook persistent module resolution failures in PnP
- Next.js Turbopack incompatibility with PnP

The `node-modules` linker gives you all of Berry's CLI, tooling, and monorepo improvements while maintaining full compatibility with existing dependencies.

### Migration Path (if pursued)

```
Phase 1: Yarn Berry with node-modules linker
  - yarn set version berry
  - Add .yarnrc.yml with nodeLinker: node-modules
  - Update CI scripts (--frozen-lockfile -> --immutable)
  - Update Dockerfile
  - Add packageManager field to package.json
  - Enable Corepack on Vercel (ENABLE_EXPERIMENTAL_COREPACK=1)
  - Test all workflows

Phase 2 (optional, future): Evaluate PnP
  - Only after Sentry, Storybook, and Turbopack add PnP support
  - Use yarn dlx @yarnpkg/doctor to audit compatibility
  - Migrate incrementally
```

### Estimated Effort
- **Phase 1**: Low-medium. Mostly config changes and CI updates. Main risk is undiscovered edge cases in the Nx + Yarn Berry + Vercel pipeline.
- **Phase 2**: High. Requires upstream ecosystem changes that are not in your control.

### Alternative: pnpm

Multiple 2025-2026 sources suggest pnpm as a strong alternative for Nx monorepos:
- Similar strictness benefits to Yarn Berry (no phantom dependencies)
- Content-addressed storage (disk space savings)
- Better Nx integration out of the box
- No PnP compatibility concerns
- Faster cold installs than Yarn `node-modules` mode (~28.6s vs ~52.3s in benchmarks)
- Excellent Vercel support

This may be worth evaluating alongside Yarn Berry if the primary goals are performance and strictness rather than Yarn-specific features.

---

## Sources

- [Yarn Berry Migration Guide (Official)](https://yarnpkg.com/migration/guide)
- [Yarn Berry Benefits Overview](https://yarnpkg.com/migration/overview)
- [Yarn PnP Migration Guide](https://yarnpkg.com/migration/pnp)
- [Vercel Corepack Support](https://vercel.com/changelog/corepack-experimental-is-now-available)
- [Vercel Yarn 2 Guide](https://vercel.com/guides/does-vercel-support-yarn-2)
- [Nx + Yarn Berry Issues (nx#11472)](https://github.com/nrwl/nx/issues/11472)
- [Nx + Yarn 4 Issues (nx#22062)](https://github.com/nrwl/nx/issues/22062)
- [Storybook + Yarn PnP (storybook#19764)](https://github.com/storybookjs/storybook/issues/19764)
- [Storybook + Yarn 4 PnP (storybook#27094)](https://github.com/storybookjs/storybook/issues/27094)
- [Storybook Yarn 4 Migration Investigation (storybook#24552)](https://github.com/storybookjs/storybook/issues/24552)
- [Sentry CLI + PnP (sentry-cli#1204)](https://github.com/getsentry/sentry-cli/issues/1204)
- [Sentry Next.js + PnP (sentry-javascript#13641)](https://github.com/getsentry/sentry-javascript/issues/13641)
- [Next.js + Yarn 4 Turbopack (next.js#74648)](https://github.com/vercel/next.js/issues/74648)
- [Next.js + Yarn PnP VSCode (next.js#72621)](https://github.com/vercel/next.js/issues/72621)
- [Yarn Berry TypeScript Path Aliases (berry#5653)](https://github.com/yarnpkg/berry/issues/5653)
- [Zero-Installs Repo Size (berry#4845)](https://github.com/yarnpkg/berry/discussions/4845)
- [Playwright + Yarn 2 Browser Install (playwright#13550)](https://github.com/microsoft/playwright/issues/13550)
- [Husky + lint-staged + Berry (berry#2460)](https://github.com/yarnpkg/berry/discussions/2460)
- [GSAP Public NPM Migration](https://gsap.com/resources/private-repo-migration/)
- [2026 Package Manager Benchmarks](https://dev.to/_d7eb1c1703182e3ce1782/npm-vs-pnpm-vs-yarn-package-manager-showdown-2026-benchmarks-2c38)
- [pnpm Official Benchmarks](https://pnpm.io/benchmarks)
