# CLAUDE.md

Guidance for Claude Code (claude.ai/code) in this repository.

## Project Overview

Personal portfolio site and blog: Next.js 16 (App Router), React 19, TypeScript. Nx monorepo with pnpm workspaces. Live: https://danieljoffe.com

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

- **Pre-push**: `pnpm tsc --noEmit` and `pnpm nx test root` must both be green before any push.
- **Branching, repo specifics** (base rules come from the master rules): always `git fetch origin` first and work from remote refs. Before creating or updating a PR, check `git log develop..main --oneline`; if `develop` is behind, merge `main` into `develop` and push — this sync push to `develop` is the sanctioned exception. Flag merge conflicts for the user.
- **Lint beyond standard** (pre-commit + CI enforce; knowing these avoids a failed cycle): custom rules `require-button-name` (`name` required on `<Button>`) and `no-raw-headings` (kit heading components, never raw `<h1>`–`<h6>`); import order builtin → external → `@danieljoffe.com/*` → `@/*` → local; `import/no-cycle` and `@nx/enforce-module-boundaries` violations are errors.

## Guides & Rules

Always loaded:

- @.claude/docs/architecture.md
- @.claude/docs/coding-conventions.md

Path-scoped (`.claude/rules/`, load only when editing matching files): content posts & style guide, testing & CI, Sentry.

## Skills & Agents

Self-describing — `ls .claude/skills` / `ls .claude/agents`. Frequent: `/verify-root`, `/verify-sharedui`, `/storybook-check`, `/coverage-gaps`, `/gen-test`, `/pr-review`, `/security-review`, `/write-content`, `/review-content-style`, `/batch-commit`, `/deploy-preview`, `/release-notes`.

## Session Persistence

The context-mode plugin tracks session state and injects its own usage guidance. Outside it: `.claude/docs/decisions.md` (manually-maintained append-only ADR log, injected on SessionStart) and the hand-curated `.claude/docs/`.

## Nx & Next.js

- Run tasks through Nx with the package-manager prefix (`pnpm nx run` / `run-many` / `affected`) — never the underlying tooling directly; check `nx_docs` / `--help` instead of guessing flags.
- `nx-workspace` skill for workspace exploration; `nx-generate` first for scaffolding.
- Non-trivial Next.js framework work: ground in current APIs via `next-devtools-mcp` (`init`, `nextjs_docs`).

## Summarizing

Preserve: task objective and acceptance criteria, file paths touched, test results and errors, decisions with reasoning, which rules files were loaded.
