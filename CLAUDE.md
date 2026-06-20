# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio website for Daniel Joffe built with Next.js 16 (App Router), React 19, and TypeScript. This is an Nx monorepo with pnpm workspaces.

Live site: https://danieljoffe.com

## Quick Reference

```bash
pnpm nx dev root          # Dev server at localhost:3000
pnpm nx test root         # Unit tests
pnpm nx e2e root-e2e      # E2E tests (Playwright)
pnpm tsc --noEmit         # Typecheck
pnpm pom                  # Full quality gate: typecheck → lint → format → test → coverage → e2e → Lighthouse
```

## Critical Guardrails

### Pre-Push Checklist

Before pushing, **always** run `pnpm tsc --noEmit` and `pnpm nx test root`. Do not push if either fails.

### Git Branching

- **`develop`** is the default base branch for all PRs
- **`main`** is production — only `develop` merges into `main`
- Never open a PR targeting `main` directly from a feature branch
- **Always use remote refs**: `git fetch origin` first, use `origin/main`, `origin/develop` — never stale local branches
- **Keep `develop` in sync with `main`**: Before creating or updating a PR, check if `develop` is behind `main` (`git log develop..main --oneline`). If so, merge `main` into `develop` and push. Flag merge conflicts for the user.

### TypeScript

- `exactOptionalPropertyTypes` is enabled. Declare `prop: string | undefined`, not `prop?: string`, when a prop can receive `undefined`.
- Pre-commit hooks run lint-staged (ESLint + Prettier) then full typecheck. Both must pass.

### ESLint

- **Custom rules**: `require-button-name` (enforces `name` prop on `<Button>`) and `no-raw-headings` (enforces heading components from kit instead of raw `<h1>`–`<h6>`)
- **Import ordering**: builtin → external → `@danieljoffe.com/*` → `@/*` → local
- **Cycle detection**: `import/no-cycle` — circular imports are errors
- **Module boundaries**: `@nx/enforce-module-boundaries` restricts cross-project imports

## Detailed Guides

Always loaded:

- **Architecture & structure**: @.claude/docs/architecture.md
- **Coding conventions**: @.claude/docs/coding-conventions.md

Loaded contextually via `.claude/rules/` (path-scoped — only when editing matching files):

- **Content posts & style guide** — MDX and content data files
- **Testing & CI** — spec, test, story, and config files
- **Sentry integration** — Sentry and instrumentation files

## Skills & Agents

Skills (`.claude/skills/`, invoke via `/name`) and review agents (`.claude/agents/`)
are self-describing — run `ls .claude/skills` / `ls .claude/agents` for the current
set (each carries its own description). Highlights:

- **Verify / quality**: `/verify-root`, `/verify-sharedui`, `/storybook-check`, `/coverage-gaps`, `/gen-test`
- **Review**: `/pr-review` (orchestrates the `*-reviewer` agents in parallel), `/security-review`
- **Content**: `/write-content`, `/review-content-style`
- **Workflow**: `/batch-commit`, `/deploy-preview`, `/release-notes`, `/monitor-ci`

- **Rules** (`.claude/rules/`): path-scoped instructions, loaded only when editing matching files.
- **Docs** (`.claude/docs/`): reference — a couple are `@`-imported above; most are read on demand.

## Session Persistence (context-mode plugin)

Session state is managed by the [context-mode](https://github.com/mksglu/context-mode) plugin.

- **Automatic**: File edits, git ops, tasks, and errors are tracked in SQLite. No manual markdown updates needed.
- **Compaction-safe**: PreCompact builds priority-tiered snapshots (2KB budget). SessionStart restores from snapshots.
- **Searchable knowledge**: Project docs can be indexed via `ctx_index` and queried via `ctx_search`.
- **Sandbox execution**: Use `ctx_execute` for operations that produce large output; only stdout enters the context window.

### What the plugin does NOT manage

- **decisions.md** (`.claude/docs/decisions.md`) — still a manually-maintained append-only ADR log. Injected on SessionStart via hook.
- **Curated docs** (`.claude/docs/`) — still maintained by hand. Can be indexed into context-mode's FTS5 database for search.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

## Summary Instructions

When summarizing this conversation, always preserve:

- The current task objective and acceptance criteria
- File paths that have been read or modified
- Test results and error messages
- Decisions made and the reasoning behind them
- Which rules files were loaded and why

## General Guidelines for working with NextJS

- For **non-trivial** Next.js framework work (App Router internals, caching/rendering strategies, middleware, version upgrades), the `next-devtools-mcp` `init` tool and `nextjs_docs` are useful to ground in current APIs. Reach for them when the task warrants it — not for routine content/component edits.
