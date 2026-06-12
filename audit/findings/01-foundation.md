# Phase 1 Findings — Foundation (Nx + Storybook)

**Run date:** 2026-05-06
**Branch:** audit/wyrdfold-pre-deploy
**Base:** origin/develop
**Skills mirrored:** /nx-audit, /storybook-check

## Summary

10 findings total: 0 P0, 4 P1, 4 P2, 2 P3. No deploy-blocking issues. Top concern is a broken `pnpm test:python` script that targets a non-existent `mypy` Nx target on `wyrdfold-api` (and `audit-api`) — the actual target name is `typecheck`, so the Python CI gate currently no-ops or errors. Storybook builds for both affected projects (`@danieljoffe/shared-ui` and `@danieljoffe.com/root`) pass cleanly.

## Resolution status

All findings except 1.9 were resolved on this branch. **1.9 is a false positive**: `libs/shared/audit/package.json` already carries the Crystal-style `nx.tags` field (`["scope:shared", "type:lib", "platform:shared"]`) — the agent overlooked it because it expected a `project.json`. Both shared libs are correctly tagged via different but equally valid Crystal patterns, so no change is needed.

| #    | Status            | Notes                                                                                                               |
| ---- | ----------------- | ------------------------------------------------------------------------------------------------------------------- |
| 1.1  | ✅ Fixed          | `package.json` script renamed `mypy` → `typecheck`. Verified: `pnpm test:python` runs all three targets.            |
| 1.2  | ✅ Fixed          | `apps/wyrdfold-e2e/project.json` tagged `["scope:wyrdfold", "type:e2e"]`.                                           |
| 1.3  | ✅ Verified       | `pnpm nx lint wyrdfold-e2e` passes; module boundary enforcement now active.                                         |
| 1.4  | ✅ Documented     | Added `// content-build` annotation to `apps/wyrdfold/project.json` explaining the intentional empty-targets state. |
| 1.5  | ✅ Fixed          | `nx.json` `production` namedInput excludes Playwright config + `e2e/**` + `*.spec.ts`.                              |
| 1.6  | ✅ Fixed          | `nx.json` `sharedGlobals` adds `package.json` + `pnpm-lock.yaml`.                                                   |
| 1.7  | ✅ Fixed          | Both Python projects' `lint`/`test`/`typecheck` inputs include `{workspaceRoot}/pyproject.toml` + `uv.lock`.        |
| 1.8  | ✅ Fixed          | Both Python projects' `test` target now overrides `dependsOn: []` (opts out of `^build`).                           |
| 1.9  | ❌ False positive | `libs/shared/audit/package.json` has `nx.tags` via Crystal — no fix needed.                                         |
| 1.10 | ✅ Fixed          | Root `affected` script now includes `build-storybook`.                                                              |

## Findings

| #    | Severity | Area              | Finding                                                                                                                                                                                                                                                                                                          | Suggested fix                                                                                                                  |
| ---- | -------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1.1  | P1       | Task pipeline     | `package.json` script `test:python` runs `nx run-many --target=lint,mypy,test --projects=wyrdfold-api,audit-api` but neither project defines a `mypy` target — they expose `typecheck` (apps/wyrdfold-api/project.json:33; apps/audit-api/project.json:34).                                                      | Rename the script's `mypy` to `typecheck`, or add a `mypy` alias target.                                                       |
| 1.2  | P1       | Module boundaries | `apps/wyrdfold-e2e/project.json` has `"tags": []`, so the `type:e2e` rule in eslint.config.mjs (`onlyDependOnLibsWithTags: ['type:app']`) cannot apply (eslint.config.mjs depConstraints type:e2e block).                                                                                                        | Add `["type:e2e", "scope:wyrdfold"]` to `apps/wyrdfold-e2e/project.json` tags.                                                 |
| 1.3  | P1       | Module boundaries | `apps/wyrdfold-api` is tagged `type:app` and declares `dependsOn: ["^build"]` on Docker/test targets, but the `type:app` constraint also bans cross-app deps — the unscoped `wyrdfold-e2e` could currently import from `wyrdfold-api` undetected (eslint.config.mjs scope rules; project.json tags).             | Once 1.2 is fixed, run `pnpm nx graph` and `pnpm nx lint wyrdfold-e2e` to confirm boundary enforcement.                        |
| 1.4  | P1       | Configuration     | `apps/wyrdfold/project.json` is empty (`"targets": {}`) and inherits everything from the `@nx/next/plugin` inference, but unlike `apps/root` it has no `validate-content`/`generate-search-index` chain — confirm WyrdFold has no MDX/build-time content (apps/wyrdfold/project.json vs apps/root/project.json). | Document that WyrdFold deliberately skips content scripts, or add equivalents if it ships MDX.                                 |
| 1.5  | P2       | Configuration     | `nx.json` `production` namedInput excludes `*.stories.*` and `.storybook/**` but does not exclude Playwright fixtures/configs (`playwright.config.ts`, `e2e/**`) — e2e changes invalidate library production caches (nx.json namedInputs).                                                                       | Add `!{projectRoot}/playwright.config.[jt]s` and `!{projectRoot}/e2e/**` to `production`.                                      |
| 1.6  | P2       | Configuration     | `nx.json` `sharedGlobals` lists only `eslint.config.mjs` and `tsconfig.base.json`; missing `package.json`, `pnpm-lock.yaml`, and `.nvmrc`/Node version — dependency or Node bumps don't bust caches (nx.json sharedGlobals lines).                                                                               | Add `{workspaceRoot}/pnpm-lock.yaml`, `{workspaceRoot}/package.json` to `sharedGlobals`.                                       |
| 1.7  | P2       | Build & CI        | Python targets on `wyrdfold-api`/`audit-api` (`lint`, `test`, `typecheck`) cache, but inputs do not include `{workspaceRoot}/pyproject.toml` or `{workspaceRoot}/uv.lock`, so a workspace-level Python dep bump is invisible to the cache (apps/wyrdfold-api/project.json lint inputs).                          | Add `{workspaceRoot}/pyproject.toml` and `{workspaceRoot}/uv.lock` to inputs on Python targets.                                |
| 1.8  | P2       | Task pipeline     | `wyrdfold-api` test target has `dependsOn: ["^build"]` (added by targetDefaults) but `wyrdfold-api` has no JS upstream deps, and Python tests don't need a JS build — wastes graph cycles (nx.json targetDefaults.test).                                                                                         | Override on the Python projects with `"dependsOn": []` to opt out.                                                             |
| 1.9  | P3       | Project structure | `libs/shared/audit` has no `project.json` — relies entirely on inferred `package.json` config (libs/shared/audit/package.json). Acceptable per Crystal plugin conventions, but inconsistent with `libs/shared/ui` which has both.                                                                                | Either remove `libs/shared/ui/project.json` (slim) or add a minimal `project.json` to `libs/shared/audit` for tag consistency. |
| 1.10 | P3       | Build & CI        | Root `package.json` script `affected` runs `nx affected -t lint test build typecheck e2e` but does not include `build-storybook` — Chromatic-bound storybook isn't part of the affected gate.                                                                                                                    | Add `build-storybook` to the `affected` script targets (or document that Chromatic handles it independently).                  |

## Storybook build report

```
NX   Successfully ran target build-storybook for 2 projects

@danieljoffe/shared-ui   → libs/shared/ui/storybook-static (built clean)
@danieljoffe.com/root        → built clean
```

Affected projects vs `origin/develop` with a `build-storybook` target: both projects in the workspace that own Storybook (`@danieljoffe/shared-ui`, `@danieljoffe.com/root`) are affected, both built successfully. Vite emits a non-blocking chunk-size warning for `iframe.js` (1.1 MB) and `blocks.js` (815 kB) inside Storybook's own bundle — this is internal Storybook chunking, not story code. No deprecated APIs, missing addons, or broken stories detected. No `apps/wyrdfold` Storybook exists (intentional — the WyrdFold app does not own a Storybook target).

## Out-of-scope notes

- `apps/wyrdfold/vercel.json` has a cron `/api/jobs/poll @ 0 9 * * *` — verify the route exists and is auth-protected (Phase 2).
- WyrdFold app uses relative cross-folder imports like `../jobs/types` from `insights/charts/colors.ts` — works but encourages folder coupling; consider a `src/types/` barrel (Phase 2 / refactor).
- `apps/wyrdfold/package.json` lists `@danieljoffe.com/wyrdfold@0.0.1` but has no `private: true` field at app level (workspace root sets it) — low priority.
- `nx-cloud` / `nxCloudId` was not visible in the inspected `nx.json` slice — confirm CI remote caching is configured (Phase 3 / CI audit).
- `pnpm` workspace uses `customConditions: ["@danieljoffe.com/source"]` in `tsconfig.base.json` — elegant, but if any downstream tool ignores `customConditions` it will resolve to `dist`. Worth a Phase 2 typecheck-on-build sanity pass.
- Both Python apps (`wyrdfold-api`, `audit-api`) have `mypy strict = true` — Phase 2 should run `pnpm nx typecheck wyrdfold-api` to confirm a green baseline before deploy.
