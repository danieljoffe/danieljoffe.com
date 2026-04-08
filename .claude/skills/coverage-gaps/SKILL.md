---
name: coverage-gaps
description: Find components missing unit tests or Storybook stories, then generate stubs
disable-model-invocation: true
user-invocable: true
---

# Coverage Gaps

Scan the codebase for components missing unit tests or Storybook stories, report the gaps, and optionally generate stubs.

## Arguments

`/coverage-gaps` — no arguments (scans all component directories)
`/coverage-gaps --fix` — also generate stub files for each gap found

## Instructions

1. **Scan shared-ui library** (`libs/shared/ui/src/lib/`):

   For each `.tsx` file that is NOT a `.spec.tsx`, `.stories.tsx`, or `index.ts`:
   - Check if a matching `.spec.tsx` exists → if not, flag as **missing spec**
   - Check if a matching `.stories.tsx` exists → if not, flag as **missing story**

2. **Scan kit components** (`apps/root/src/components/kit/`):

   For each `.tsx` file that is NOT a `.spec.tsx`, `.stories.tsx`, or `index.ts`:
   - Check if a matching `.spec.tsx` exists → if not, flag as **missing spec**

3. **Scan app components** (`apps/root/src/components/`):

   For each `.tsx` file (non-spec, non-story, non-index) in the top-level components directory:
   - Check if a matching `.spec.tsx` exists → if not, flag as **missing spec**

4. **Scan hooks** (`apps/root/src/hooks/`):

   For each `.ts` hook file (not `__tests__/`, not `index.ts`):
   - Check if a matching `.spec.ts` exists in `__tests__/` or alongside → if not, flag as **missing spec**

5. **Output the report:**

   ```markdown
   ## Coverage Gaps Report

   ### Shared UI (libs/shared/ui/src/lib/)

   | Component | Spec | Story |
   | --------- | ---- | ----- |
   | Button    | ✓    | ✓     |
   | CTACard   | ✓    | ✗     |

   ### Kit Components (apps/root/src/components/kit/)

   | Component | Spec |
   | --------- | ---- |
   | PostCard  | ✗    |

   ### Summary

   - **X** components missing specs
   - **Y** components missing stories
   - **Z** hooks missing specs
   ```

6. **If `--fix` is passed**, generate stub files for each gap:
   - **For missing specs**: Use `/gen-test` conventions — read 2-3 existing specs in the same directory for patterns, then generate a spec with: smoke test, basic props/variants, jest-axe accessibility check.
   - **For missing stories**: Read 2-3 existing stories in the same directory, then generate a story with: default variant, key prop variations using `args`, proper meta export with `title` matching the component path.

   Run each generated spec to verify it passes before moving on.

## Rules

- Do not modify existing spec or story files.
- Only scan `.tsx` component files and `.ts` hook files — skip utilities, types, constants.
- Skip files that are purely type definitions or re-exports.
- For shared-ui stories: follow the `@danieljoffe.com/shared-ui` Storybook structure.
- For shared-ui specs: import from `'./ComponentName'`, use `@testing-library/react`.
- Report mode (no `--fix`) is read-only — do not create or modify any files.
