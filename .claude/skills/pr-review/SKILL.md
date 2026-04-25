---
name: pr-review
description: Run all reviewer agents (a11y, perf, content, nx, security) in parallel on changed files and summarize findings
disable-model-invocation: true
user-invocable: true
---

# PR Review

Run all reviewer agents in parallel on the current branch's changed files and produce a unified report.

## Token Budget Rules

- Route `git diff` and file list output through `ctx_execute` — diffs can be large
- Each spawned agent inherits ctx_batch_execute — remind them to use it for large outputs

## Arguments

`/pr-review` — no arguments needed (uses current branch diff against develop)

## Instructions

1. **Identify changed files:**

   ```bash
   git diff --name-only origin/develop...HEAD
   ```

2. **Categorize files** to determine which reviewers to run:
   - **a11y-reviewer**: Any `.tsx` files in `components/`, `libs/shared/ui/`, or `app/`
   - **perf-reviewer**: Any `.tsx`/`.ts` files touching components, hooks, API routes, or config
   - **content-reviewer**: Any `.mdx` files in `data/content/`
   - **nx-reviewer**: Any `project.json`, `tsconfig*.json`, `nx.json`, or workspace config files
   - **security-reviewer**: Any `.ts`/`.tsx` files in `app/api/`, `lib/`, `proxy.ts`, `middleware.ts`, or files touching env vars, auth, Supabase, or Resend

3. **Launch applicable reviewers in parallel** using the Agent tool:
   - Pass the list of relevant changed files to each agent
   - Each agent should read the changed files and apply its review checklist

4. **Collect and deduplicate findings** from all agents.

5. **Output a unified report:**

   ```markdown
   ## PR Review Summary

   **Branch**: <branch-name>
   **Files changed**: <count>
   **Reviewers run**: <list>

   ### Critical (must fix)

   - [ ] file:line — description (reviewer)

   ### Warnings (should fix)

   - [ ] file:line — description (reviewer)

   ### Suggestions (nice to have)

   - [ ] file:line — description (reviewer)

   ### Passed Checks

   - ✓ description (reviewer)
   ```

6. If no issues found, report a clean bill of health.

## Rules

- Only run reviewers that have relevant files to check — skip if no matching files changed.
- Do not make any code changes — this is read-only analysis.
- Group findings by severity, not by reviewer.
