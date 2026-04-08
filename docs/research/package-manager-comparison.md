# Package Manager Comparison: Yarn Classic vs Yarn Berry vs pnpm vs Bun vs npm

> Research compiled April 2026 for `danieljoffe.com` monorepo
> Companion to [yarn-v2-migration.md](./yarn-v2-migration.md)

---

## Performance Benchmarks (2025-2026)

| Scenario                              | npm v11    | Yarn Classic | Yarn 4 (node-modules) | pnpm v10       | Bun      |
| ------------------------------------- | ---------- | ------------ | --------------------- | -------------- | -------- |
| Cold install (50 deps)                | ~14s       | ~10s         | ~8s                   | ~4s            | **0.8s** |
| Cold install (800-dep monorepo)       | 134s       | ~90s         | ~52s                  | ~25s           | **4.8s** |
| Warm/cached install                   | ~30s       | ~20s         | ~15s                  | **~755ms**     | ~500ms   |
| CI install (typical monorepo)         | ~48s       | ~35s         | ~30s                  | ~14s           | **~3s**  |
| Disk usage (10 projects, shared deps) | 10x copies | 10x copies   | 10x copies            | **1x (store)** | ~1x      |

Sources: [2026 Package Manager Showdown](https://dev.to/pockit_tools/pnpm-vs-npm-vs-yarn-vs-bun-the-2026-package-manager-showdown-51dc), [pnpm vs npm 2026](https://tech-insider.org/pnpm-vs-npm-2026/), [Syncfusion 2026](https://www.syncfusion.com/blogs/post/pnpm-vs-npm-vs-yarn)

---

## Stack Compatibility Matrix

How each package manager works with our specific technologies.

| Technology                  | npm v11  | Yarn 4 (node-modules) | pnpm v10                                    | Bun (PM only)                                           |
| --------------------------- | -------- | --------------------- | ------------------------------------------- | ------------------------------------------------------- |
| **Nx 22**                   | Works    | Works                 | Works                                       | Works (use text `bun.lock`)                             |
| **Next.js 16 / Turbopack**  | Works    | Works                 | Works                                       | Works                                                   |
| **Sentry (@sentry/nextjs)** | Works    | Works                 | **Needs hoisting config**                   | Works (needs `trustedDependencies`)                     |
| **Storybook**               | Works    | Works                 | CLI quirks; runtime works                   | Works (runs under Node)                                 |
| **Playwright**              | Works    | Works                 | Works                                       | Needs `trustedDependencies` or explicit browser install |
| **Jest / RTL**              | Works    | Works                 | Works                                       | Works (runs under Node)                                 |
| **GSAP**                    | Works    | Works                 | Works                                       | Works                                                   |
| **Husky + lint-staged**     | Works    | Works                 | Works                                       | Needs `trustedDependencies` for `prepare`               |
| **Vercel**                  | Works    | Works (Corepack)      | **Excellent** (Vercel uses pnpm internally) | Works (zero-config)                                     |
| **GitHub Actions**          | Built-in | Needs Corepack setup  | `pnpm/action-setup@v5`                      | `oven-sh/setup-bun`                                     |
| **Docker**                  | Works    | Works                 | Better (`pnpm fetch` for layer caching)     | Nx+Bun Docker has edge cases                            |

### Risk per tool (higher = more migration debugging)

| Tool       | npm  | Yarn 4 | pnpm                                           | Bun                           |
| ---------- | ---- | ------ | ---------------------------------------------- | ----------------------------- |
| Sentry     | None | None   | **Medium-High** (needs `public-hoist-pattern`) | Low                           |
| Storybook  | None | None   | Low-Medium (transitive deps)                   | None                          |
| Playwright | None | None   | None                                           | Low-Medium (postinstall)      |
| Nx tooling | None | None   | None                                           | Low-Medium (lockfile parsing) |
| Docker     | None | None   | None                                           | Medium (Nx+Bun edge cases)    |

---

## Feature Comparison

| Feature                                | npm v11            | Yarn 4                  | pnpm v10               | Bun                                |
| -------------------------------------- | ------------------ | ----------------------- | ---------------------- | ---------------------------------- |
| **Strict deps** (no phantom deps)      | No                 | PnP only                | **Yes (default)**      | Yes (default)                      |
| **Content-addressable store**          | No                 | PnP only                | **Yes**                | Partial                            |
| **Workspace protocol** (`workspace:*`) | Yes                | Yes                     | Yes                    | Yes                                |
| **Monorepo filtering** (`--filter`)    | No                 | `foreach`               | **Yes (fast)**         | No                                 |
| **Catalogs** (shared versions)         | No                 | Constraints engine      | **Yes**                | No                                 |
| **Patch dependencies**                 | No                 | `yarn patch`            | `pnpm patch`           | No                                 |
| **Lockfile format**                    | JSON               | YAML (merge-friendly)   | YAML                   | Text (custom)                      |
| **Auto-migrate from yarn.lock**        | No                 | `yarn install` converts | `pnpm import`          | `bun install` auto-converts        |
| **Corepack support**                   | Yes                | Yes                     | Yes                    | No (separate binary)               |
| **Overrides/resolutions**              | `overrides`        | `resolutions`           | `pnpm.overrides`       | Both `resolutions` + `overrides`   |
| **Offline install**                    | `--prefer-offline` | Zero-installs (PnP)     | `--offline` with store | `--prefer-offline`                 |
| **Postinstall scripts**                | Auto               | Auto                    | Auto                   | **Opt-in** (`trustedDependencies`) |

---

## Migration Effort Estimate

| Aspect                  | npm                                   | Yarn 4                                         | pnpm                                     | Bun                                     |
| ----------------------- | ------------------------------------- | ---------------------------------------------- | ---------------------------------------- | --------------------------------------- |
| **Estimated time**      | 1-2 hours                             | 2-3 hours                                      | 2-4 hours                                | 1-3 hours                               |
| **Config file changes** | Delete `yarn.lock`, run `npm install` | New `.yarnrc.yml`, convert lockfile            | New `pnpm-workspace.yaml`, `pnpm import` | Delete `yarn.lock`, `bun install`       |
| **CI changes**          | Minimal (npm built-in)                | `--frozen-lockfile` -> `--immutable`, Corepack | Add `pnpm/action-setup`, update scripts  | Add `oven-sh/setup-bun`, update scripts |
| **Docker changes**      | Update install command                | Update install command                         | Better (`pnpm fetch` layer caching)      | Install Bun, update commands            |
| **Vercel changes**      | None (auto-detect)                    | Set `ENABLE_EXPERIMENTAL_COREPACK=1`           | None (auto-detect)                       | None (auto-detect)                      |
| **Script changes**      | `yarn` -> `npm run` / `npx`           | `--frozen-lockfile` -> `--immutable`           | `yarn` -> `pnpm`                         | `yarn` -> `bun run` / `bunx`            |
| **Biggest risk**        | None — but no gains either            | Nx + Vercel + Corepack edge cases              | **Sentry hoisting**                      | Postinstall scripts, Nx Docker          |

### Project-specific migration gotchas

**pnpm:**

- Sentry will almost certainly need `public-hoist-pattern[]=@sentry/*` in `.npmrc`
- Storybook may need explicit transitive deps added
- Your 13 `resolutions` entries translate to `pnpm.overrides`

**Bun:**

- Add `playwright`, `husky`, `@sentry/cli` to `trustedDependencies`
- Nx lockfile parsing — use text `bun.lock`, not binary `bun.lockb`
- Missing `--filter` for workspace-scoped updates (Nx handles this via task graph)

**Yarn 4:**

- `--frozen-lockfile` -> `--immutable` across 4+ CI files
- Vercel needs Corepack env var
- Yarn binary (~2.5MB) committed to `.yarn/releases/`
- Large lockfile diff on first migration commit

**npm:**

- `resolutions` -> `overrides` (different syntax for nested deps)
- Slowest of all options
- Least featured workspace tooling (Nx compensates)

---

## Overall Ranking for This Project

### 1. pnpm (Recommended)

**Why:** Best balance of speed, strictness, ecosystem maturity, and tooling. Vercel uses it internally. Nx has first-class support. Content-addressable store saves significant disk space. Catalogs eliminate version drift.

**Caveat:** Sentry needs hoisting config. Budget extra debugging time for `@sentry/nextjs`.

### 2. Bun (PM only)

**Why:** 5-25x faster installs. Dead-simple migration from Yarn Classic (auto-converts lockfile). Growing ecosystem with Vercel zero-config support.

**Caveat:** Younger ecosystem. Missing workspace features (`--filter`, catalogs). Postinstall opt-in model requires `trustedDependencies` for several of your tools. Nx+Bun Docker has rough edges.

### 3. Yarn 4 (node-modules mode)

**Why:** Closest to current setup (same brand). Constraints engine. `yarn patch`. YAML lockfile.

**Caveat:** PnP (the main selling point) is blocked by Sentry, Storybook, Playwright, and Vercel. With `nodeLinker: node-modules`, you get CLI improvements but miss the headline features. Yarn Classic v1 -> v4 is a bigger mental shift than expected.

### 4. npm v11

**Why:** Ships with Node — zero setup. Simplest migration. No compatibility risks.

**Caveat:** Slowest. Least featured. No strict deps. No content-addressable store. If you're going to migrate anyway, pnpm gives you more for the same effort.

---

## Decision Matrix

| If your priority is...              | Choose                           |
| ----------------------------------- | -------------------------------- |
| **Speed above all**                 | Bun                              |
| **Best overall for monorepos**      | pnpm                             |
| **Disk space savings**              | pnpm                             |
| **Strictest dependency management** | pnpm                             |
| **Lowest migration risk**           | npm                              |
| **Staying in the Yarn ecosystem**   | Yarn 4                           |
| **Best Vercel integration**         | pnpm (Vercel uses it themselves) |
| **Best CI performance**             | Bun > pnpm > Yarn 4 > npm        |

---

## Recommendation

**Migrate to pnpm.** It offers the best combination of:

- Meaningful speed improvement (7x faster monorepo installs vs Yarn Classic)
- Strict dependency resolution that catches real bugs
- Content-addressable store (significant disk savings)
- Excellent Nx and Vercel support
- Mature, battle-tested ecosystem
- Active development with features like Catalogs

The one thing to plan for: Sentry's module interception doesn't play perfectly with pnpm's strict `node_modules` layout. Budget time to configure `public-hoist-pattern` entries. Beyond that, the migration is straightforward — `pnpm import` reads your existing `yarn.lock` directly.

If **raw speed** is the top priority and you're comfortable with a younger ecosystem, Bun as PM-only is a compelling alternative with 5x faster installs than even pnpm.

---

## Sources

### pnpm

- [Nx + pnpm Workspaces Guide](https://nx.dev/blog/setup-a-monorepo-with-pnpm-workspaces-and-speed-it-up-with-nx)
- [Sentry + Nx + pnpm module resolution (sentry-javascript#10306)](https://github.com/getsentry/sentry-javascript/issues/10306)
- [Sentry pnpm monorepo issue (sentry-javascript#14946)](https://github.com/getsentry/sentry-javascript/issues/14946)
- [Storybook 10 + pnpm (storybook#32608)](https://github.com/storybookjs/storybook/issues/32608)
- [Vercel zero-config pnpm](https://vercel.com/changelog/projects-using-pnpm-can-now-be-deployed-with-zero-configuration)
- [Vercel pnpm v10 support](https://vercel.com/changelog/automatic-pnpm-v10-support)
- [pnpm Docker guide](https://pnpm.io/docker)
- [pnpm Catalogs](https://pnpm.io/catalogs)
- [CKEditor Yarn-to-pnpm migration](https://ckeditor.com/blog/migrating-multi-repo-yarn-classic-to-pnpm/)
- [OVHcloud Yarn-to-pnpm migration](https://itnext.io/hybrid-and-incremental-migration-from-yarn-to-pnpm-at-ovhcloud-10ea65e1e7dc)

### Bun

- [Bun Package Manager docs](https://bun.com/package-manager)
- [Nx + Bun lockfile support (nx#29423)](https://github.com/nrwl/nx/pull/29423)
- [Nx + Bun Docker issues (nx#25978)](https://github.com/nrwl/nx/issues/25978)
- [Bun text lockfile announcement](https://bun.com/blog/bun-lock-text-lockfile)
- [Bun trusted dependencies](https://bun.sh/guides/install/trusted)
- [Bun workspace limitations (bun#25177)](https://github.com/oven-sh/bun/issues/25177)
- [Vercel Bun zero-config](https://vercel.com/changelog/bun-install-is-now-supported-with-zero-configuration)
- [Is Bun Production-Ready in 2026?](https://dev.to/last9/is-bun-production-ready-in-2026-a-practical-assessment-181h)

### npm

- [npm Overrides RFC](https://github.com/npm/rfcs/blob/main/accepted/0036-overrides.md)
- [Yarn Classic End of Life](https://endoflife.date/yarn)
- [Vercel Package Managers docs](https://vercel.com/docs/package-managers)

### General

- [2026 Package Manager Showdown (benchmarks)](https://dev.to/pockit_tools/pnpm-vs-npm-vs-yarn-vs-bun-the-2026-package-manager-showdown-51dc)
- [pnpm vs npm 2026 benchmarks](https://tech-insider.org/pnpm-vs-npm-2026/)
- [PNPM vs NPM vs Yarn 2026 — Syncfusion](https://www.syncfusion.com/blogs/post/pnpm-vs-npm-vs-yarn)
- [npm vs Yarn vs pnpm 2026](https://thesoftwarescout.com/npm-vs-yarn-vs-pnpm-2026-which-javascript-package-manager-should-you-use/)
- [pnpm Official Benchmarks](https://pnpm.io/benchmarks)
