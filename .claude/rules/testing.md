---
paths:
  - '**/*.spec.*'
  - '**/*.test.*'
  - '**/*.stories.*'
  - '**/jest.config*'
  - '**/vitest.config*'
  - '**/playwright.config*'
  - '**/test-setup*'
  - '**/.github/workflows/**'
---

# Testing Conventions

## Unit Tests

- Jest config: `apps/root/jest.config.ts`, setup: `apps/root/src/test-setup.ts`
- GSAP plugins mocked in `apps/root/__mocks__/`
- Coverage threshold: 65% minimum (branches, functions, lines, statements)
- Shared-ui unit tests also run on Jest (`libs/shared/ui/jest.config.ts`); Vitest (`libs/shared/ui/vitest.config.ts`) runs the Storybook interaction tests in-browser

## E2E Tests

- Playwright config: `apps/root-e2e/playwright.config.ts`
- CI runs Chromium only; local runs all browsers + mobile
- Snapshot updates via `workflow_dispatch` with `update-snapshots: true`

## Storybook Interaction Tests

Stories with `play` functions follow these rules strictly:

- **Query by role first.** `getByRole('button', { name: 'Label' })` — never `getByText` for interactive elements. `getByText` only for non-interactive content.
- **Always `waitFor` after state changes.** Any `userEvent` that triggers React state needs `waitFor` on subsequent assertions.
- **Never assert CSS classes.** No `toHaveClass('opacity-0')`. Assert ARIA attributes (`aria-hidden`, `aria-pressed`, `aria-expanded`), DOM state (`toBeDisabled()`, `toBeChecked()`), or presence/absence.
- **No `.tagName` checks.** Assert absence of a role instead.
- **Use `step()` for 3+ sequential interactions.** Groups related phases for self-documenting Interactions panel.
- **Every `fn()` spy must be asserted.** Dead spies are noise — remove or assert them.
- **Use `{ hidden: true }` for `aria-hidden` elements.**

## CI Pipelines

- `ci.yml`: Push to `develop` + PRs (except to `main`). Runs lint, typecheck, test, build, e2e (PR only), Chromatic, Lighthouse.
- `ci-preview.yml`: PRs to `main` (release validation). Source branch must be `develop`.
- Docs-only PRs skip CI via `changes` job shell check. `ci-status` gate still passes.
- Branch protection requires `ci-status` (not `ci`) so docs-only PRs can merge.
