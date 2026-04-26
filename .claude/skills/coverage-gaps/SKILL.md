---
name: coverage-gaps
description: Find components missing unit tests or Storybook stories, and optionally audit test quality
disable-model-invocation: true
user-invocable: true
argument-hint: '[--fix] [--quality]'
---

# Coverage Gaps

Scan the codebase for components missing unit tests or Storybook stories, report the gaps, and optionally generate stubs. With `--quality`, also audit existing tests for anti-patterns.

## Token Budget Rules

- Route file listing and test output through `ctx_batch_execute` — scanning many directories produces large output
- When running generated specs (`--fix`), route test output through `ctx_execute`

## Arguments

- `/coverage-gaps` — scan for missing tests and stories (read-only, full codebase)
- `/coverage-gaps --changed` — scan only components changed on the current branch (fastest)
- `/coverage-gaps --fix` — also generate stub files for each gap found
- `/coverage-gaps --quality` — also audit existing test quality (unit + E2E)
- `/coverage-gaps --fix --quality` — both
- Flags combine: `/coverage-gaps --changed --fix`

## Instructions

### Part 0: Scope detection (if `--changed`)

If `--changed` is passed, narrow the scan to only changed component files:

```bash
BASE=$(gh pr view --json baseRefName --jq '.baseRefName' 2>/dev/null || echo "develop")
git diff --name-only origin/${BASE}...HEAD -- '*.tsx' '*.ts' | grep -v '\.spec\.\|\.test\.\|\.stories\.\|__tests__\|__mocks__'
```

From this list, identify which directories each file belongs to (shared-ui, kit, components, hooks) and only scan those files in Part 1 below. Skip directories with no changed files. This avoids scanning hundreds of files when only a few changed.

### Part 1: Coverage Scan (always runs)

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

### Part 2: Quality Audit (only with `--quality`)

#### 2.1 Unit Test Quality

Read all `.spec.tsx` and `.spec.ts` files in these directories:

- `libs/shared/ui/src/lib/**`
- `apps/root/src/components/**`
- `apps/root/src/hooks/**`
- `apps/root/src/lib/**`
- `apps/root/src/app/api/**`

Check each test file for these anti-patterns:

**Weak assertions:**

- `toBeDefined()` or `toBeTruthy()` as the only assertion on a rendered element (should assert text, role, or attributes)
- `toMatchSnapshot()` without any behavioral assertions (snapshot-only tests are brittle)
- `expect(something).not.toBeNull()` when a stronger assertion is possible

**Mock issues:**

- Mocks that replicate implementation details (e.g., mocking internal state) instead of mocking at boundaries (API calls, modules)
- Dead mocks: `jest.mock(...)` or `jest.fn()` that are never asserted or never trigger
- Missing mock restoration (`jest.restoreAllMocks()` or per-test cleanup) in files that mock globals

**Query anti-patterns (Testing Library):**

- `getByText` used for interactive elements (buttons, links, tabs) — should use `getByRole`
- `container.querySelector` or `container.getElementsBy*` — should use Testing Library queries
- `getByTestId` when a role or label query would work — test IDs are a last resort

**Missing accessibility:**

- Component spec files that render interactive UI but never call `axe()` from `jest-axe`
- Components with form inputs that don't assert `aria-describedby` on error states

**Convention violations:**

- Spec files importing from `'react'` to use `forwardRef` in mocks (should use React 19 ref-as-prop)
- Test descriptions that don't describe behavior ("test 1", "works correctly")

#### 2.2 E2E Test Quality

Read all `.spec.ts` files in `apps/root-e2e/src/`.

Check each E2E test for:

**Selector resilience:**

- Selectors using CSS classes, tag names, or XPath — should use `getByRole`, `getByLabel`, `getByText`, or `data-testid`
- Hard-coded text strings that could break with copy changes — prefer `data-testid` for structural elements

**Timing issues:**

- `page.waitForTimeout()` (fixed delays) — should use `page.waitForSelector()`, `page.waitForResponse()`, or `expect().toBeVisible()` with auto-retry
- Missing `await` on Playwright actions or assertions
- Assertions without Playwright's built-in auto-retry (raw `expect(await page.$())` instead of `await expect(page.locator()).toBeVisible()`)

**Missing patterns:**

- Tests that navigate but don't assert the page loaded (missing URL or heading assertion after navigation)
- Form tests that submit but don't assert the success/error state
- Tests that mock API responses but don't assert the request was made (`page.route` without `page.waitForRequest`)
- Missing `test.describe` grouping for related scenarios

**Critical flow coverage:**
Review whether these user flows have E2E coverage (flag missing ones):

- Homepage load and navigation
- Blog listing, search, tag filtering, pagination
- Project listing and tag filtering
- Contact form submission (success + validation errors)
- Audit tool scan flow
- Mobile navigation (hamburger menu)
- Theme toggle (dark/light)
- Keyboard navigation on interactive components
- 404 and error pages

### Part 3: Report

Output findings grouped by category:

```markdown
## Quality Audit

### Unit Test Issues

| Severity | File               | Issue                                                             |
| -------- | ------------------ | ----------------------------------------------------------------- |
| MEDIUM   | Button.spec.tsx:42 | `getByText` used for button — use `getByRole('button', { name })` |
| LOW      | Modal.spec.tsx:18  | `toBeDefined()` only — assert visible text or role                |

### E2E Test Issues

| Severity | File                  | Issue                                                                  |
| -------- | --------------------- | ---------------------------------------------------------------------- |
| HIGH     | navigation.spec.ts:55 | `waitForTimeout(2000)` — use `waitForSelector` or auto-retry assertion |
| MEDIUM   | contact-form.spec.ts  | No assertion on validation error messages                              |

### Missing E2E Flows

- ✗ Theme toggle
- ✗ Mobile navigation
- ✓ Contact form submission

### Summary

- **X** unit test quality issues (Y high, Z medium)
- **X** E2E test quality issues (Y high, Z medium)
- **X** critical flows missing E2E coverage
```

## Severity Guide

- **HIGH**: Test gives false confidence (weak assertion on critical path, flaky timing, dead mock hiding a bug)
- **MEDIUM**: Anti-pattern that reduces maintainability (wrong query type, missing a11y check, poor test description)
- **LOW**: Style issue or minor improvement (snapshot-only test, missing grouping)

## Rules

- Do not modify existing spec or story files (unless `--fix` is passed, and only for _missing_ files).
- Quality audit is read-only — report issues, never auto-fix existing tests.
- Only scan `.tsx` component files and `.ts` hook files for coverage — skip utilities, types, constants.
- Skip files that are purely type definitions or re-exports.
- For shared-ui stories: follow the `@danieljoffe.com/shared-ui` Storybook structure.
- For shared-ui specs: import from `'./ComponentName'`, use `@testing-library/react`.
- Report mode (no `--fix`) is read-only — do not create or modify any files.
