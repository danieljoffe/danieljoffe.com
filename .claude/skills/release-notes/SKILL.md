---
name: release-notes
description: Diff develop vs main and generate release notes from merged work
disable-model-invocation: true
user-invocable: true
argument-hint: '<format: pr|changelog|summary> (default: pr)'
---

# Release Notes

Diff `develop` against `main`, analyze all merged work, and generate release content.

## Token Budget Rules

- Route git log and diff output through `ctx_batch_execute` — these can be large
- Batch all `gh pr view` calls into a single `ctx_batch_execute` instead of calling per-PR

## Instructions

1. **Gather the diff**
   - Run via `ctx_batch_execute`:
     ```
     [
       { "label": "commits",    "command": "git fetch origin && git log main..develop --oneline --no-merges" },
       { "label": "merges",     "command": "git log main..develop --oneline --merges" },
       { "label": "diff-stat",  "command": "git diff main..develop --stat" }
     ]
     ```
   - Extract PR numbers from merge commits, then batch all `gh pr view` calls into one `ctx_batch_execute`:
     ```
     [
       { "label": "PR-123", "command": "gh pr view 123 --json title,body,labels,number" },
       { "label": "PR-124", "command": "gh pr view 124 --json title,body,labels,number" },
       ...
     ]
     ```

2. **Categorize changes**
   Group the work into these categories (skip empty ones):
   - **Features**: New functionality, new pages, new components
   - **Enhancements**: Improvements to existing functionality
   - **Bug Fixes**: Corrections to broken behavior
   - **Accessibility**: ARIA, keyboard nav, screen reader improvements
   - **Performance**: Speed, bundle size, caching improvements
   - **Design System**: shared-ui component changes, token alignment
   - **Content**: New blog posts, case studies, experience entries
   - **Infrastructure**: CI, config, dependencies, tooling
   - **Documentation**: README, docs, comments

3. **Generate output based on format argument**

   **`pr` (default)** — PR description for a develop-to-main merge PR:

   ```
   ## Release: <short descriptive title>

   ### Highlights
   <2-3 sentence summary of the most impactful changes>

   ### Changes
   #### <Category>
   - <Change description> (#PR)
   ...

   ### Stats
   - **PRs merged**: N
   - **Files changed**: N
   - **Lines**: +N / -N
   ```

   **`changelog`** — CHANGELOG.md entry:

   ```
   ## [YYYY-MM-DD]

   ### <Category>
   - <Change description> (#PR)
   ...
   ```

   **`summary`** — Plain text summary for Slack, email, or standups:

   ```
   Released N PRs to production:
   - <Highlight 1>
   - <Highlight 2>
   - <Highlight 3>
   Full diff: <N files, +N/-N lines>
   ```

4. **Present the output**
   - Show the generated content in a fenced code block so it's easy to copy.
   - If format is `pr`, offer to create the develop-to-main PR with the generated body.

## Rules

- Always use `main..develop` direction (what's new on develop that isn't on main).
- Pull PR context from GitHub — don't guess at what a PR did from commit messages alone.
- Attribute changes to their PR numbers for traceability.
- Keep descriptions concise — one line per change, focused on the "what" and "why".
- If there are no differences between main and develop, say so and stop.
- Never modify any files — this skill is read-only.
