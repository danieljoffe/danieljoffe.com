---
name: batch-commit
description: Review all staged/unstaged changes, batch them into cohesive commits, and push
disable-model-invocation: true
user-invocable: true
---

# Batch Commit & Push

Review all pending changes, group them into logical commits, and push each one.

## Instructions

1. **Assess the changeset**
   - Run `git status` and `git diff --stat` (both staged and unstaged) to see all modified, added, and deleted files.
   - Run `git log --oneline -5` to understand the recent commit style.

2. **Plan commit batches**
   - Group files by logical concern (e.g., dependency upgrades, feature code, config changes, documentation, test fixes).
   - Each batch should tell a coherent story — a reviewer should understand the "why" from the commit alone.
   - Prefer smaller, focused commits over large catch-all commits.
   - Present the batching plan before executing.

3. **For each batch, in order:**
   - `git reset HEAD -- .` (only on the first batch if files are already staged, to re-stage selectively).
   - `git add <specific files>` — stage only the files for this batch.
   - `git diff --staged --stat` — confirm what's staged looks right.
   - Compose a commit message following the project's conventional commit style:
     - Format: `type(scope): short description` or `type: short description`
     - Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`, `perf`, `ci`
     - Body (if needed) should explain "why", not "what"
     - End with `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`
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
