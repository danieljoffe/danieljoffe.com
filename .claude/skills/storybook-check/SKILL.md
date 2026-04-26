---
name: storybook-check
description: Build Storybook for affected projects and report any errors
disable-model-invocation: true
user-invocable: true
---

# Storybook Check

Build Storybook for projects affected by current changes and report any broken stories.

## Token Budget Rules

- Route Storybook build output through `ctx_execute` — builds produce verbose output
- Route `nx show projects` through `ctx_batch_execute`

## Arguments

`/storybook-check` — no arguments needed (detects affected projects automatically)

## Instructions

1. **Detect base branch and identify affected projects:**

   ```bash
   BASE=$(gh pr view --json baseRefName --jq '.baseRefName' 2>/dev/null || echo "develop")
   pnpm nx show projects --affected --base=origin/${BASE} --type=lib
   pnpm nx show projects --affected --base=origin/${BASE} --type=app
   ```

   Cross-reference with projects that have a `build-storybook` target.

2. **Run Storybook builds for affected projects:**

   ```bash
   pnpm nx run-many -t build-storybook --projects=<affected-projects-with-storybook>
   ```

   If no affected projects have Storybook, report that and exit.

3. **Analyze output** for:
   - Build errors (missing imports, type errors, broken stories)
   - Warnings about deprecated APIs or missing dependencies
   - Stories that reference components that no longer exist

4. **Report results:**

   ```markdown
   ## Storybook Check

   **Projects checked**: <list>

   ### Errors

   - project — error description

   ### Warnings

   - project — warning description

   ### Passed

   - ✓ project — built successfully (<N> stories)
   ```

5. If all builds pass, report success with story counts.

## Rules

- Do not start a Storybook dev server — only build.
- Do not modify any files.
- If `build-storybook` target doesn't exist for a project, skip it silently.
