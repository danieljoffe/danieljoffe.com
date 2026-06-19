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

## 2026-06-18: Generate the MDX component/metadata import maps

**Context:** Adding a content post meant hand-editing 3 files: the slug constant (`data/blog.ts` etc.), a ~50-line import map (`data/content/{type}/index.ts` — one `import X, { metadata } from './slug.mdx'` plus two `Record` entries per post), and the order array (`data/contentOrder.ts`). The import map was the painful, error-prone one: a missed entry silently breaks the build, and it duplicated information already present in the filesystem. Investigated full automation (drop the `.mdx`, regenerate everything). Two constraints ruled out deriving the _order_: project display order is curated (e.g. seven projects share git-date `2026-01-11`, sub-sorted by real work chronology) and not expressible by `metadata.date`; and the `*PageSlugs` array order is load-bearing for the About page list and three structured-data `ItemList`s. `import.meta.glob` was also ruled out — it is Turbopack-only and the production build is `next build --webpack`.

**Decision:** Generate only the import maps. `scripts/generate-content-registry.ts` scans `data/content/{blog,projects,experience}/*.mdx` and emits `data/generated/{type}.generated.ts` exporting `{type}MdxComponents` + `{type}MdxMetadata` (static `@/`-aliased imports — the shape webpack already bundles). `data/content/{type}/index.ts` becomes a thin re-export that re-types the maps to `Record<Allowed{Type}Slugs, …>` so a missing/extra slug is a compile error. Output is gitignored and regenerated via `postinstall` and as an Nx `dependsOn` of `build`/`test`. The slug constants and `contentOrder.ts` stay hand-authored — that is where slug identity and publish date/order (the _intent_) live.

**Consequence:** Adding a post drops from 3 hand-edited files to 2 (slug constant + dated order line); the error-prone import map is gone and can't drift. Publish date/order stays fully author-controlled, so no display reordering risk. Trade-off: a new gitignored generated layer that must exist before typecheck (covered by `postinstall` + Nx deps); the `Record<string, …>` → `Record<Allowed…Slugs, …>` re-typing happens at the `index.ts` boundary to keep the generated files free of `@/types` imports (avoids an import cycle). Fully eliminating the slug constant was left as a follow-up — it requires moving the order-sensitive consumers onto the curated history arrays.

## 2026-06-18: Derive content display order from a metadata `order` field (remove contentOrder.ts)

**Context:** After generating the import maps (entry above), adding a post still meant 2 hand-edited files: the slug constant and a dated line in `data/contentOrder.ts` (the `projectHistory`/`experienceHistory`/`blogHistory` arrays). That order file duplicated authoring intent and could silently drift. Sorting by `metadata.date` was considered to drop it, but the live display order is git-commit chronology, **not** `metadata.date`: e.g. `contact-form-case-study` (`date: 2025-08-21`) renders 9th not 1st, and `wyrdfold-case-study` (`date: 2026-05-02`, the flagship) renders **last**, not 13th. Sorting by the existing dates would reorder the portfolio and bury the flagship; six projects also share `date: 2026-01-11`.

**Decision:** Add a required `order: number` to `PostMetadata`, authored per-MDX as sparse multiples of 10, and sort each type by it in `contentRegistry.ts` (slug as a stable tie-breaker). Existing posts were migrated to `order = (current display index + 1) * 10`, preserving today's order byte-for-byte. Deleted `contentOrder.ts` and moved its `PaginationLink`/`PostPaginationData` interfaces to `types/postTypes.ts`. Because `types/mdx.d.ts` _asserts_ every MDX `metadata` is a `PostMetadata`, a missing/duplicate `order` is not a compile error — so presence + uniqueness are enforced at module load in `contentRegistry.ts` (throws → fails `next build`) and by a registry unit test that also prints the resolved per-type order. `date` stays an honest publish/work date (feeds JSON-LD `datePublished` and the visible label); `order` carries display position only.

**Consequence:** Adding a post drops to 1 hand-edited file (the slug constant) plus the `order` line that already lives in the MDX — no separate order file to drift, and same-date posts disambiguate cleanly. Trade-off: display order is now spread across ~69 MDX files instead of one commented array, so the single-glance "why this order" view is gone — mitigated by the unit test printing the full resolved per-type sequence. The slug-constant array order stays hand-authored (still backs `Allowed*Slugs`, the About list, and the structured-data `ItemList`s); fully eliminating it remains the open follow-up.
