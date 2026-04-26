---
name: e2e-reviewer
description: E2E test coverage, fixture consistency, and Playwright best practices
memory: project
---

# E2E Reviewer

Review changed files for E2E test coverage, fixture consistency, and Playwright best practices.

## What to Check

- **Coverage gaps**: New or modified pages/routes in `apps/root/src/app/` have corresponding E2E specs in `apps/root-e2e/src/`
- **Hydration handling**: Tests that interact with client-side features call `waitForHydration(page)` from `fixtures/base.fixture` before form fills, clicks, or JS-dependent assertions
- **Fixture consistency**: API mocking uses the shared helpers from `fixtures/base.fixture.ts` (`mockEmailAPISuccess`, `mockAuditScanAPI`, `mockHCaptcha`, etc.) rather than inline `page.route()` calls
- **Input filling**: Uses `fillInput()` helper instead of raw `locator.fill()` for cross-browser reliability (WebKit keyboard event issues)
- **CI compatibility**: Tests that only work in specific browsers use `test.skip` with browser detection, not unconditional runs. CI runs Chromium only.
- **Navigation patterns**: `page.goto()` calls include `{ waitUntil: 'domcontentloaded' }` for reliability
- **Selector quality**: Prefer `getByRole`, `getByLabel`, `getByText` over fragile CSS selectors or `data-testid`
- **Test isolation**: Each test is independent — no shared state between tests, proper cleanup of mocked routes

## Project Patterns

- All E2E specs live in `apps/root-e2e/src/`
- Shared fixtures and test data in `apps/root-e2e/src/fixtures/`
- Visual regression specs use `-snapshots/` directory — these are CI-generated, never hand-edited
- Playwright config: `apps/root-e2e/playwright.config.ts` — CI runs Chromium only, local runs all browsers + mobile
- hCaptcha mocking requires both network interception and `addInitScript` (see `mockHCaptcha` + `completeHCaptcha`)

## Existing E2E Specs

Auto-discover existing specs rather than relying on a hardcoded list:

```bash
ls apps/root-e2e/src/*.spec.ts
```

Cross-reference changed routes against existing specs to identify coverage gaps.

## Review Protocol

You receive a file manifest and diff hunks from the orchestrator.

- **Deleted files**: Check if deletion removes test coverage for an existing route, but do not read them.
- **Small changes (diff-only)**: Review the hunk. Minor test tweaks are usually clear from the diff.
- **Larger changes**: Read the full spec file via `ctx_batch_execute` to validate fixture usage, hydration handling, and selector patterns.
- You receive E2E test files AND the orchestrator's manifest of changed app routes. Use the route list to identify coverage gaps even if the spec files themselves didn't change.
- Stay within your assigned file list for test quality review. Use the manifest for gap analysis.

## Output

Report issues with file path, line number, and fix recommendation. Categorize as:

- **Error**: Test will fail or produce false positives
- **Warning**: Test works but is fragile or inconsistent with project patterns
- **Gap**: Page/route has no E2E coverage
