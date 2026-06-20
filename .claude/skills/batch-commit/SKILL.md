---
name: batch-commit
description: Review all staged/unstaged changes, batch them into cohesive commits, and push
disable-model-invocation: true
user-invocable: true
---

# Batch Commit & Push

Review all pending changes, group them into logical commits, and push each one.

## Token Budget Rules

- Route `git diff --stat` and `git status` through `ctx_batch_execute` when the changeset is large
- Use `ctx_execute` for `git diff --staged --stat` before each commit if many files are staged

## Instructions

1. **Assess the changeset**
   - Run via `ctx_batch_execute`:
     ```
     [
       { "label": "status",  "command": "git status" },
       { "label": "diff",    "command": "git diff --stat" },
       { "label": "log",     "command": "git log --oneline -5" }
     ]
     ```

2. **Classify files and plan commit batches**

   Categorize each changed file to guide grouping:

   | Pattern                                                                  | Category     |
   | ------------------------------------------------------------------------ | ------------ |
   | `.claude/`, `CLAUDE.md`                                                  | `skill-meta` |
   | `*.spec.*`, `*.test.*`, `__tests__/*`                                    | `test`       |
   | `*.stories.tsx`                                                          | `story`      |
   | `apps/root-e2e/**`                                                       | `e2e`        |
   | `project.json`, `tsconfig*`, `nx.json`, `eslint.config*`, `package.json` | `config`     |
   | `*.mdx` in `data/content/`                                               | `content`    |
   | `*.md` (docs)                                                            | `docs`       |
   | `apps/*/src/**`, `libs/*/src/**`                                         | `source`     |

   Group files by logical concern using the categories as hints:
   - Same-category files that serve one purpose go in one commit (e.g., all skill updates, all test fixes)
   - Source + its test file go together when the test was written for that source change
   - Config changes get their own commit unless tightly coupled to a source change
   - Each batch should tell a coherent story — a reviewer should understand the "why" from the commit alone
   - Prefer smaller, focused commits over large catch-all commits
   - Present the batching plan before executing

3. **For each batch, in order:**
   - `git reset HEAD -- .` (only on the first batch if files are already staged, to re-stage selectively).
   - `git add <specific files>` — stage only the files for this batch.
   - `git diff --staged --stat` — confirm what's staged looks right.
   - Compose a commit message following the project's conventional commit style:
     - Format: `type(scope): short description` or `type: short description`
     - Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`, `perf`, `ci`
     - Body (if needed) should explain "why", not "what"
     - End with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
   - Create the commit using a HEREDOC for the message.
   - `git push` after each commit.

4. **After all batches:**
   - Run `git status` to confirm a clean working tree.
   - Summarize what was pushed (commit hashes, titles, file counts).

## Rules

- Never use `git add -A` or `git add .` — always add specific files.
- Never use `--no-verify` or skip hooks.
- Never force-push.
- Never amend existing commits — always create new ones.
- If a pre-commit hook fails, fix the issue and create a new commit (do not amend).
- Do not commit files that contain secrets (`.env`, credentials, API keys).
- If the working tree is already clean, say so and stop.
