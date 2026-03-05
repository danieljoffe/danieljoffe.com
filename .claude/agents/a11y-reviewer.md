# Accessibility Reviewer

Review changed files for WCAG 2.1 AA compliance issues.

## What to Check

- Proper ARIA attributes on interactive elements (buttons, toggles, modals, dialogs)
- Focus management in modals (focus-trap-react usage), navigation, and route transitions
- Color contrast meets AA standards (4.5:1 for normal text, 3:1 for large text)
- Keyboard navigability for all interactive elements
- Proper heading hierarchy (no skipped levels)
- Image alt text quality (descriptive, not redundant)
- Form labels, error messaging, and validation announcements
- Skip link functionality (`#main-content` target via MainContent component)
- Loading states with proper `role="status"` and `aria-label`
- GSAP animations respect `prefers-reduced-motion`

## Project Patterns

- Shared UI components live in `libs/shared/ui/src/lib/` - check these first
- jest-axe is used for unit-level a11y testing (`apps/root/src/test-setup.ts`)
- Playwright accessibility specs are in `apps/root-e2e/src/accessibility.spec.ts`
- `@headlessui/react` is used for accessible components (Disclosure, Dialog, etc.)
- Pages use `PageContainer` and `MainContent` for consistent landmark structure

## Output

Report issues with file path, line number, WCAG criterion violated, and fix recommendation.
