# Decisions Log

Append-only log of architectural and convention decisions.
Each entry records what was decided and why, so future sessions
have context without re-discovering the reasoning.

Format: newest entries at the bottom.

---

## 2026-04-13: Session persistence via Claude Code hooks over ruflo

**Context:** Investigated ruflo (claude-flow) as an AI orchestration platform for persistent codebase memory, multi-agent coordination, and security auditing. Found it adds significant complexity (daemon process, 313 MCP tools, vector database) for a single-developer portfolio.

**Decision:** Use Claude Code's built-in hooks system (SessionStart, PreCompact, SessionEnd) with lightweight markdown files instead of ruflo's orchestration layer. Session notes and a decisions log provide persistent context across sessions without external dependencies.

**Consequence:** No daemon process or vector database to maintain. Context persistence depends on hook scripts and markdown files, which are transparent, grep-able, and version-controlled. Trade-off: no semantic search over past decisions (would need manual grep or reading the file).

## 2026-04-13: Convention enforcement via deterministic checks over AI inference

**Context:** Evaluated how to enforce content style guide rules (canonical tags, character limits, em dash restrictions) and coding conventions. Ruflo's approach uses AI agents to review code; the alternative is Zod schemas and lint rules.

**Decision:** Encode enforceable conventions as deterministic checks (Zod validation script, custom ESLint rules) rather than relying on AI inference. Reserve AI judgment for genuinely ambiguous decisions.

**Consequence:** Rules that can be machine-checked (title length, canonical tags, duplicate cover images) are enforced at build time. This is faster, cheaper, and more predictable than LLM-based review. The content style guide becomes executable, not just prose.

## 2026-04-13: Knip v6 for dead code detection

**Context:** After 349+ PRs, unused exports, files, and dependencies have likely accumulated. No tooling currently catches this.

**Decision:** Adopt Knip v6 (oxc-based, 5M+ weekly downloads) with per-workspace configuration for the Nx monorepo. Phase into CI gradually: report-only first, then fail on unused dependencies, then full enforcement.

**Consequence:** Dead code gets surfaced automatically. Knip's Nx/Next.js/Jest/Storybook/Playwright plugins understand the workspace structure. The MDX compiler config handles metadata exports.

## 2026-04-13: Renovate with dependency cooldowns for supply chain safety

**Context:** No automated dependency updates exist. No supply chain security scanning.

**Decision:** Adopt Renovate (not Dependabot) with `minimumReleaseAge: "3 days"` for devDeps, 7 days for production deps, 14 days for majors. Pair with Socket.dev for behavioral analysis.

**Consequence:** Dependency updates happen automatically with a safety buffer. A 3-day cooldown would have prevented most 2025 supply chain attacks. Tightly coupled packages (Nx, Storybook, TypeScript-ESLint) are grouped into single PRs.

## 2026-04-14: Replace markdown session persistence with context-mode plugin

**Context:** The initial session persistence system (latest.md + archive + PreCompact/SessionEnd hooks from PR #368) required manual markdown updates by Claude during sessions. This was fragile: if Claude forgot to update latest.md before compaction, context was lost. Evaluated mksglu/context-mode as an automatic alternative.

**Decision:** Adopt the context-mode marketplace plugin which provides automatic SQLite-backed session persistence with FTS5 search, priority-tiered compaction snapshots, and sandbox execution. Remove manual markdown lifecycle hooks (PreCompact, SessionEnd). Keep a slim SessionStart hook for decisions.md injection only.

**Consequence:** Session state survives compaction automatically without manual intervention. The decisions.md log remains the human-readable record of architectural choices. Trade-off: session history is now in SQLite (not grep-able markdown), and the plugin has an Elastic-2.0 license (fine for personal use).

## 2026-06-11: Split wyrdfold onto its own Supabase project

**Context:** One Supabase project (`danieljoffe.com`, ref `grwmzluuqyczatkxorfa`) backed three things: the anonymous audit tool (`apps/root`, service-role writes, zero auth users), the portfolio/blog (no DB), and the wyrdfold job-search product (`apps/wyrdfold` + `apps/wyrdfold-api`, which owns all `auth.users` and ~24 tables). The two products share no auth coupling — the audit side never references `auth.uid()` — so they are cleanly separable, and the shared project's `[remotes.production]` auth was already configured for `wyrdfold.com`.

**Decision:** Stand up a dedicated, isolated Supabase project for wyrdfold (own URL/keys/migrations/auth). Manage it from a **second `supabase/` workdir** at `apps/wyrdfold-api/supabase/`, driven by the CLI's `--workdir` flag (exposed as `pnpm db:wf:*`). Baseline the new project from the live schema/data (copy + `db pull`) rather than replaying 90 interleaved migrations. Migrate all wyrdfold data including `auth.users`/`auth.identities` with UUIDs preserved. Cut over by env scope only (Railway for the API, the wyrdfold Vercel project for the app) — no application code changes.

**Consequence:** wyrdfold and the portfolio/audit tool become independently operable and blast-radius isolated. Trade-off: two Supabase projects and two migration histories to maintain (root `supabase/` for audit; `apps/wyrdfold-api/supabase/` for wyrdfold); the auth fork is permanent (cutover done in a short maintenance window); the wyrdfold auth/template blocks in the root `supabase/config.toml` become vestigial and are dropped in a later cleanup phase along with the wyrdfold tables in the old project.

## 2026-06-15: Replace manual shared-ui publish workflow with Changesets

**Context:** The `publish-shared-ui.yml` manual-dispatch workflow bumped `package.json` and ran `git push origin HEAD --tags` to land the release commit on `main`. Branch protection ("Changes must be made through a pull request") rejected that push (`GH013`), so every real publish half-completed: `0.2.1` reached npm but the repo `package.json` stayed at `0.2.0` and no Release was created. The root flaw is pushing a version-bump commit directly to a protected branch — something no standard release tool does.

**Decision:** Adopt Changesets (`@changesets/cli` + `changesets/action@v1`) as the release mechanism. Contributors add a changeset file per change; on push to `main` the action opens a bot-maintained "Version Packages" PR (pushed to `changeset-release/main`, never to `main` directly), and merging it triggers `pnpm release` (build + `changeset publish`) to publish to npm with tags + GitHub Releases. Config: `access: public`, `baseBranch: main`; all non-publishable packages are `private: true` so Changesets ignores them automatically. Remove `publish-shared-ui.yml`. Bump `libs/shared/ui` to `0.2.1` to reconcile the repo with npm.

**Consequence:** Version bumps are automatic yet routed through a PR, so they never fight branch protection, and the publish job only tags/publishes (no branch push). Trade-off: the bot's Version PR needs a non-default token (`RELEASE_TOKEN` PAT/App token) to trigger the required status checks — with the default `GITHUB_TOKEN` the PR is created but its CI won't run, leaving it unmergeable. The legacy `shared-ui-v*` tags remain; new tags follow the Changesets `@danieljoffe/shared-ui@x.y.z` convention.
