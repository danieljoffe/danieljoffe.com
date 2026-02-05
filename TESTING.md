# Testing & Quality Assurance Guide

This document outlines the comprehensive testing and quality assurance setup for the Daniel Joffe portfolio website.

## Overview

The project implements a multi-layered testing strategy including:

- **Unit Tests**: Component-level testing with Jest and React Testing Library
- **Integration Tests**: End-to-end testing with Playwright
- **Accessibility Testing**: Automated a11y testing with axe-core
- **Performance Testing**: Lighthouse CI integration
- **Code Quality**: ESLint, Prettier, and Husky pre-commit hooks

## Testing Stack

### Unit Testing

- **Jest**: Test runner and assertion library
- **React Testing Library**: Component testing utilities
- **@testing-library/user-event**: User interaction simulation
- **jest-axe**: Accessibility testing matchers

### End-to-End Testing

- **Playwright**: Cross-browser testing framework
- **@axe-core/playwright**: Accessibility testing integration

### Performance Testing

- **Lighthouse CI**: Automated performance auditing
- **Core Web Vitals**: Performance metrics monitoring

### Code Quality

- **ESLint**: Code linting with strict rules
- **Prettier**: Code formatting
- **Husky**: Git hooks for quality checks
- **lint-staged**: Pre-commit linting

## Running Tests

### Unit Tests

```bash
# Run all unit tests
yarn test

# Run tests with coverage
yarn test:coverage

# Run tests in watch mode
npx nx test root --watch
```

### End-to-End Tests

```bash
# Run all E2E tests
yarn test:e2e

# Run specific test file
npx playwright test accessibility.spec.ts

# Run tests in headed mode
npx playwright test --headed

# Run tests in debug mode
npx playwright test --debug
```

### Accessibility Tests

```bash
# Run accessibility tests
npx playwright test --grep="Accessibility Tests"

# Run with specific browser
npx playwright test --project=chromium --grep="Accessibility Tests"
```

### Performance Tests

```bash
# Run performance tests
npx playwright test --grep="Performance Tests"

# Run Lighthouse CI
yarn test:lighthouse

# Collect Lighthouse data only
yarn test:lighthouse:collect

# Assert against Lighthouse thresholds
yarn test:lighthouse:assert
```

### Code Quality

```bash
# Run ESLint
yarn lint

# Fix ESLint issues
yarn lint:fix

# Check Prettier formatting
yarn format:check

# Format code with Prettier
yarn format
```

## Test Coverage

### Unit Test Coverage

- **Target**: 70% minimum coverage
- **Components**: All React components
- **Utilities**: Helper functions and constants
- **Hooks**: Custom React hooks

### E2E Test Coverage

- **Critical User Flows**: Navigation, form submission, contact
- **Cross-browser**: Chrome, Firefox, Safari, Mobile browsers
- **Responsive Design**: Mobile and desktop viewports
- **Error Handling**: 404 pages, form validation

### Accessibility Coverage

- **WCAG 2.1 AA Compliance**: All pages and components
- **Keyboard Navigation**: Tab order and focus management
- **Screen Reader**: ARIA labels and semantic HTML
- **Color Contrast**: WCAG color contrast ratios

### Performance Coverage

- **Core Web Vitals**: LCP, FID, CLS
- **Page Load Times**: < 3 seconds
- **Bundle Size**: < 500KB JavaScript
- **Image Optimization**: Lazy loading and proper formats

## Test Configuration

### Jest Configuration

- **Environment**: jsdom for React components
- **Setup**: Custom test setup with mocks
- **Coverage**: Thresholds for branches, functions, lines, statements
- **Transform**: TypeScript and React JSX support

### Playwright Configuration

- **Browsers**: Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari
- **Timeouts**: 30s global, 10s action, 10s expect
- **Retries**: 2 retries in CI, 0 locally
- **Screenshots**: On failure
- **Videos**: Retain on failure

### Lighthouse Configuration

- **Performance**: 80% minimum score
- **Accessibility**: 90% minimum score
- **Best Practices**: 80% minimum score
- **SEO**: 80% minimum score
- **Core Web Vitals**: Specific thresholds for LCP, FID, CLS

## Pre-commit Hooks

Husky is configured to run quality checks before each commit:

1. **ESLint**: Lint and fix JavaScript/TypeScript files
2. **Prettier**: Format code files
3. **Type Check**: TypeScript compilation check

## CI/CD Pipeline

The GitHub Actions workflow includes:

1. **Lint and Format Check**: ESLint and Prettier validation
2. **Unit Tests**: Jest tests with coverage reporting
3. **E2E Tests**: Playwright cross-browser testing
4. **Accessibility Tests**: Automated a11y testing
5. **Performance Tests**: Lighthouse CI integration
6. **Security Audit**: Dependency vulnerability scanning
7. **Build**: Application build verification
8. **Deploy**: Production deployment (main branch only)

## Writing Tests

### Unit Test Guidelines

```typescript
// Example unit test
import { render, screen, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import Button from './Button';

expect.extend(toHaveNoViolations);

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Button>Click me</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### E2E Test Guidelines

```typescript
// Example E2E test
import { test, expect } from '@playwright/test';

test('navigation works correctly', async ({ page }) => {
  await page.goto('/');

  const aboutLink = page.locator('a[href*="/about"]');
  await aboutLink.click();

  await expect(page).toHaveURL(/.*about/);
});
```

### Accessibility Test Guidelines

```typescript
// Example accessibility test
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('page has no accessibility violations', async ({ page }) => {
  await page.goto('/');

  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
```

## Best Practices

### Unit Testing

- Test component behavior, not implementation details
- Use semantic queries (getByRole, getByLabelText)
- Test accessibility with jest-axe
- Mock external dependencies
- Keep tests focused and isolated

### E2E Testing

- Test critical user journeys
- Use data-testid sparingly, prefer semantic selectors
- Wait for elements to be ready before interacting
- Test across multiple browsers and devices
- Keep tests independent and parallelizable

### Accessibility Testing

- Test with real users when possible
- Use automated tools as a baseline
- Test keyboard navigation
- Verify screen reader compatibility
- Check color contrast ratios

### Performance Testing

- Set realistic performance budgets
- Monitor Core Web Vitals
- Test on slow networks and devices
- Optimize images and assets
- Use performance profiling tools

## Troubleshooting

### Common Issues

1. **Tests timing out**: Increase timeout values or add proper waits
2. **Flaky tests**: Use deterministic selectors and proper waits
3. **Coverage gaps**: Add tests for uncovered code paths
4. **Performance regressions**: Monitor bundle size and Core Web Vitals
5. **Accessibility violations**: Fix issues and update tests

### Debug Commands

```bash
# Debug Playwright tests
npx playwright test --debug

# Run specific test with verbose output
npx playwright test --grep="specific test" --verbose

# Check Lighthouse results
yarn test:lighthouse:collect
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [axe-core Documentation](https://github.com/dequelabs/axe-core)
- [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
