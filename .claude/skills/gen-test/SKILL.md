---
name: gen-test
description: Generate unit tests for a given file using project conventions (Jest, RTL, jest-axe)
disable-model-invocation: true
user-invocable: true
---

# Generate Tests

Generate comprehensive unit tests for a given file, following this project's testing conventions.

## Arguments

`/gen-test <file-path>` — path to the file to test (relative or absolute)

## Instructions

1. **Read the target file** to understand its exports, props, and behavior.

2. **Find the correct test location:**
   - For `libs/shared/ui/src/lib/Foo.tsx` → create `libs/shared/ui/src/lib/Foo.spec.tsx`
   - For `apps/root/src/components/kit/Foo.tsx` → create `apps/root/src/components/kit/Foo.spec.tsx`
   - For `apps/root/src/hooks/useFoo.ts` → create `apps/root/src/hooks/useFoo.spec.ts`
   - Co-locate tests next to source files.

3. **Read 2-3 existing spec files** in the same directory for pattern reference:
   - Import style, test structure, naming conventions
   - How mocks are set up (especially GSAP, next/navigation, next/image)
   - Whether `jest-axe` is used for that component type

4. **Generate tests covering:**
   - Default rendering (smoke test)
   - All props/variants (map each prop to at least one test)
   - User interactions (click, type, keyboard) using `@testing-library/user-event` or `fireEvent`
   - Accessibility: `jest-axe` check (`expect(await axe(container)).toHaveNoViolations()`)
   - Edge cases: empty state, error state, loading state
   - Conditional rendering paths

5. **Follow project conventions:**
   - Use `import { render, screen, fireEvent } from '@testing-library/react'`
   - Use `describe('ComponentName', () => { ... })` top-level block
   - Use `it('does something specific', () => { ... })` (not `test()`)
   - Query preference: `getByRole` > `getByLabelText` > `getByText` > `getByTestId`
   - For shared-ui components: import from `'./ComponentName'`
   - For app components: import from `'@/components/...'`
   - Mock Next.js APIs when needed (`jest.mock('next/navigation')`, etc.)
   - Add `React` import: `import React from 'react'`

6. **Run the tests** with `npx nx test <project> -- --testPathPatterns="<TestFileName>"` to verify they pass.

7. **Fix any failures** — all generated tests must pass before finishing.

## Rules

- Never mock the component under test — only mock its dependencies.
- Never use snapshot tests — they're brittle and not used in this project.
- Never use `getByTestId` as a first choice — prefer semantic queries.
- If the file already has a spec file, extend it rather than overwriting.
