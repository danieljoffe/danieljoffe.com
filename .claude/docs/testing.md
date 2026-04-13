# Testing

## Unit Tests

- Jest config: `apps/root/jest.config.ts`
- Setup file: `apps/root/src/test-setup.ts`
- GSAP plugins are mocked in `apps/root/__mocks__/`
- Coverage threshold: 65% minimum (branches, functions, lines, statements)

## E2E Tests

- Config: `apps/root-e2e/playwright.config.ts`
- Tests: accessibility, navigation, contact-form, performance, dynamic-routes, error-handling
- CI runs only Chromium; local runs all browsers + mobile

## Storybook Interaction Tests

Stories with `play` functions are tested in-browser via Storybook's Vitest integration. Follow these rules when writing or modifying play functions:

- **Query by role first.** Use `getByRole('button', { name: 'Label' })` — never `getByText` for interactive elements (buttons, links, tabs, menuitems). `getByText` is only appropriate for non-interactive content (headings, paragraphs, empty-state messages). Reference the [Testing Library query priority](https://testing-library.com/docs/queries/about#priority).
- **Always `waitFor` after state changes.** Any `userEvent` that triggers React state (`click`, `hover`, `keyboard`) needs `waitFor` on subsequent DOM assertions. Assertions without `waitFor` are a CI flake waiting to happen.
- **Never assert CSS classes.** Don't use `toHaveClass('opacity-0')`, `toHaveClass('bg-surface')`, or check `.className`. Assert ARIA attributes (`aria-hidden`, `aria-pressed`, `aria-expanded`, `aria-current`), DOM state (`toBeDisabled()`, `toBeChecked()`), or presence/absence (`toBeInTheDocument()`). If the component doesn't expose a semantic attribute for the state you need to test, fix the component first.
- **No `.tagName` checks.** Instead of `expect(el.tagName).toBe('SPAN')`, assert the absence of a role: `expect(queryByRole('link', { name })).not.toBeInTheDocument()`.
- **Use `step()` for 3+ sequential interactions.** Group related phases (e.g., "Open menu", "Navigate items", "Close menu") so the Interactions panel is self-documenting.
- **Every `fn()` spy must be asserted.** If you define `onClick: fn()` in args, the play function must call `expect(args.onClick).toHaveBeenCalledWith(...)` or `.not.toHaveBeenCalled()`. Dead spies are noise — remove them or assert them.
- **Use `{ hidden: true }` for `aria-hidden` elements.** Elements with `aria-hidden="true"` (like tooltips before reveal) are excluded from default queries. Use `getByRole('tooltip', { hidden: true })`.

## CI Pipelines

- `ci.yml`: Runs on push to `develop` and PRs (except to `main`). Runs lint, typecheck, test, build, e2e (PR only), Chromatic, Lighthouse.
- `ci-preview.yml`: Runs on PRs to `main` (release validation). Requires source branch is `develop`.
- `ci.yml` uses a `changes` job with a shell-based file check to detect docs-only PRs. When only non-code files change (`*.md`, `.claude/*`, `.mcp.json`, `.vscode/*`, `.github/ISSUE_TEMPLATE/*`, `.github/workflows/*`, `.husky/*`, `.prettierrc`, `.nvmrc`, `.sentryclirc`, `.editorconfig`, `.nxignore`, `LICENSE`), the `ci` job is skipped but the `ci-status` gate job still runs and passes. Push events to `develop` always run CI.
- Branch protection rulesets require `ci-status` (not `ci`) so docs-only PRs can merge without running the full suite.
- Snapshot regeneration: `workflow_dispatch` with `update-snapshots: true` on `ci.yml`.
