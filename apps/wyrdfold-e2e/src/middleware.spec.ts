import { test, expect } from '@playwright/test';

// Auth middleware regression coverage. Every (app) route should bounce
// signed-out visitors to ``/login`` — when the middleware breaks (e.g.
// matcher misconfigured, ``createServerClient`` import path drift, the
// Supabase SSR cookie-write swallow regression from #681 hitting the
// no-session path), these are the canonical surfaces that catch it
// before users hit them.
//
// Each path here was a real fetch destination during the session-29
// readiness walk; if the redirect breaks the user lands on an
// auth-required page rendering "Loading..." or worse.
const PROTECTED_ROUTES = [
  '/dashboard',
  '/jobs',
  '/jobs/00000000-0000-0000-0000-000000000000', // detail route
  '/jobs/00000000-0000-0000-0000-000000000000/resume',
  '/jobs/00000000-0000-0000-0000-000000000000/cover-letter',
  '/targets',
  '/targets/00000000-0000-0000-0000-000000000000',
  '/profile',
  '/insights',
  '/settings',
  '/onboarding',
];

for (const path of PROTECTED_ROUTES) {
  test(`signed-out visitor hitting ${path} is redirected to /login`, async ({
    page,
  }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login(\?.*)?$/);
  });
}

test('login form Send button is disabled until an email is entered', async ({
  page,
}) => {
  await page.goto('/login');
  const button = page.getByRole('button', { name: 'Send magic link' });
  await expect(button).toBeDisabled();
  await page.getByLabel('Email', { exact: true }).fill('test@example.com');
  await expect(button).toBeEnabled();
});

test('login form Send button stays disabled for empty email after blur', async ({
  page,
}) => {
  // Regression for the early input-state bug noted in the user feedback:
  // an empty-then-blurred input had triggered the button to enable
  // briefly. Verify the form sticks to "non-empty required" cleanly.
  await page.goto('/login');
  const email = page.getByLabel('Email', { exact: true });
  await email.fill('hello@example.com');
  await email.fill('');
  await email.blur();
  await expect(
    page.getByRole('button', { name: 'Send magic link' })
  ).toBeDisabled();
});
