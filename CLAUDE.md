# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio website for Daniel Joffe built with Next.js 16 (App Router), React 19, and TypeScript. Nx monorepo with pnpm workspaces.

Live site: https://danieljoffe.com

## Quick Reference

```bash
pnpm nx dev root          # Dev server at localhost:3000
pnpm nx test root         # Unit tests
pnpm nx e2e root-e2e      # E2E tests (Playwright)
pnpm tsc --noEmit         # Typecheck
pnpm pom                  # Full quality gate: typecheck → lint → format → test → coverage → e2e → Lighthouse
```

Full command list (incl. `pom:affected` vs `affected`): `.claude/docs/commands.md`

## Critical Guardrails

### Pre-Push Checklist

Before pushing, **always** run `pnpm tsc --noEmit` and `pnpm nx test root`. Do not push if either fails.

### Git Branching

- **`develop`** is the default base branch for all PRs
- **`main`** is production — only `develop` merges into `main`; never PR a feature branch to `main`
- **Always use remote refs**: `git fetch origin` first, then `origin/main` / `origin/develop` — never stale local branches
- **Keep `develop` in sync with `main`**: before creating or updating a PR, check `git log develop..main --oneline`. If `develop` is behind, merge `main` into `develop` and push. Flag merge conflicts for the user.

### ESLint

Flat config at `apps/root/eslint.config.mjs` (ESLint 10):

- **Custom rules**: `require-button-name` (`name` prop required on `<Button>`) and `no-raw-headings` (kit heading components, never raw `<h1>`–`<h6>`)
- **Import ordering**: builtin → external → `@danieljoffe.com/*` → `@/*` → local
- **Cycle detection**: `import/no-cycle` — circular imports are errors
- **Module boundaries**: `@nx/enforce-module-boundaries` restricts cross-project imports

## Detailed Guides

Always loaded:

- **Architecture & structure**: @.claude/docs/architecture.md
- **Coding conventions**: @.claude/docs/coding-conventions.md

Path-scoped rules (`.claude/rules/`) load only when editing matching files: content posts & style guide, testing & CI, Sentry.

## Skills & Agents

Skills (`.claude/skills/`, invoke via `/name`) and review agents (`.claude/agents/`) are self-describing — run `ls .claude/skills` / `ls .claude/agents` for the current set. Highlights:

- **Verify / quality**: `/verify-root`, `/verify-sharedui`, `/storybook-check`, `/coverage-gaps`, `/gen-test`
- **Review**: `/pr-review` (runs the `*-reviewer` agents in parallel), `/security-review`
- **Content**: `/write-content`, `/review-content-style`
- **Workflow**: `/batch-commit`, `/deploy-preview`, `/release-notes`

## Session Persistence

The [context-mode](https://github.com/mksglu/context-mode) plugin tracks session state (file edits, git ops, tasks, errors) automatically and injects its own usage guidance at session start. It does NOT manage:

- **`.claude/docs/decisions.md`** — manually-maintained append-only ADR log, injected on SessionStart
- **`.claude/docs/`** — hand-curated reference docs, read on demand

## Nx

- Run tasks through Nx (`pnpm nx run` / `run-many` / `affected`), never the underlying tooling directly, and always prefix with the package manager (`pnpm nx ...`)
- Workspace exploration → invoke the `nx-workspace` skill first; scaffolding/generators → `nx-generate` first
- NEVER guess CLI flags — check `nx_docs` or `--help` (skip nx_docs for basic syntax you already know)
- Plugin best practices: `node_modules/@nx/<plugin>/PLUGIN.md`, when present

## Next.js

For non-trivial framework work (App Router internals, caching/rendering strategies, middleware, version upgrades), ground in current APIs via the `next-devtools-mcp` `init` tool and `nextjs_docs` — not needed for routine content/component edits.

## Summary Instructions

When summarizing this conversation, always preserve:

- The current task objective and acceptance criteria
- File paths that have been read or modified
- Test results and error messages
- Decisions made and the reasoning behind them
- Which rules files were loaded and why
