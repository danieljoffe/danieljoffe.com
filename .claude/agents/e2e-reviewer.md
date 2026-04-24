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

Check these for coverage overlap and consistency:

- `accessibility.spec.ts` — WCAG checks across pages
- `navigation.spec.ts` — Desktop/mobile nav, route transitions
- `contact-form.spec.ts` — Form submission, validation, hCaptcha
- `dynamic-routes.spec.ts` — Project/experience/blog detail pages
- `performance.spec.ts` — Core Web Vitals, resource sizes
- `error-handling.spec.ts` — 404, error boundaries
- `command-palette.spec.ts` — Keyboard shortcut search
- `audit-scan.spec.ts`, `audit-report.spec.ts` — Audit tool flows
- `api-audit.spec.ts`, `api-email.spec.ts` — API endpoint tests
- `services.spec.ts` — Services page interactions
- `visual-regression.spec.ts` — Screenshot comparisons (CI-managed)

## Output

Report issues with file path, line number, and fix recommendation. Categorize as:

- **Error**: Test will fail or produce false positives
- **Warning**: Test works but is fragile or inconsistent with project patterns
- **Gap**: Page/route has no E2E coverage
