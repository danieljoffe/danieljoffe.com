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
