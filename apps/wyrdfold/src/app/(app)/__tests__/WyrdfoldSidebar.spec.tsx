import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WyrdfoldSidebar from '../WyrdfoldSidebar';

const mockReplace = jest.fn();
const mockRefresh = jest.fn();
const mockSignOut = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: (...args: unknown[]) => mockReplace(...args),
    refresh: (...args: unknown[]) => mockRefresh(...args),
    push: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/dashboard',
}));

jest.mock('@/lib/supabase/auth-client', () => ({
  createAuthBrowserClient: () => ({
    auth: {
      signOut: (...args: unknown[]) => mockSignOut(...args),
    },
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockSignOut.mockResolvedValue({ error: null });
});

describe('WyrdfoldSidebar', () => {
  it('renders the WyrdFold home link pointing at /dashboard', () => {
    render(<WyrdfoldSidebar />);
    const home = screen.getByRole('link', { name: /wyrdfold home/i });
    expect(home).toHaveAttribute('href', '/dashboard');
  });

  it('renders all primary nav links with the expected hrefs', () => {
    render(<WyrdfoldSidebar />);
    // Each link appears in both desktop nav and mobile bar/sheet — query all
    // and just assert presence + first href.
    const expected = [
      ['Dashboard', '/dashboard'],
      ['Jobs', '/jobs'],
      ['Targets', '/targets'],
      ['Profile', '/profile'],
      ['Insights', '/insights'],
      ['Settings', '/settings'],
    ] as const;
    for (const [label, href] of expected) {
      const links = screen.getAllByRole('link', {
        name: new RegExp(`^${label}$`, 'i'),
      });
      expect(links.length).toBeGreaterThan(0);
      expect(links[0]).toHaveAttribute('href', href);
    }
  });

  it('marks the active nav item with aria-current="page"', () => {
    render(<WyrdfoldSidebar />);
    const dashboardLinks = screen.getAllByRole('link', {
      name: /^dashboard$/i,
    });
    expect(dashboardLinks[0]).toHaveAttribute('aria-current', 'page');
  });

  it('signs out via Supabase and replaces route to /login when Sign out is clicked', async () => {
    const user = userEvent.setup();
    render(<WyrdfoldSidebar />);
    await user.click(screen.getByRole('button', { name: /^sign out$/i }));
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
    expect(mockReplace).toHaveBeenCalledWith('/login');
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('toggles the mobile More sheet open and closed', async () => {
    const user = userEvent.setup();
    render(<WyrdfoldSidebar />);
    const moreBtn = screen.getByRole('button', { name: /open more menu/i });
    expect(moreBtn).toHaveAttribute('aria-expanded', 'false');

    await user.click(moreBtn);
    await waitFor(() => {
      const closeButtons = screen.getAllByRole('button', {
        name: /close more menu/i,
      });
      // The toggle (was "More" / "Open more menu") now reads "Close more menu"
      // and reflects aria-expanded='true'. There's also a separate X icon
      // close button — both share the label, so just confirm one is expanded.
      expect(
        closeButtons.some(b => b.getAttribute('aria-expanded') === 'true')
      ).toBe(true);
    });

    // Click the X icon (the last "Close more menu" button) to close the sheet.
    const closeButtons = screen.getAllByRole('button', {
      name: /close more menu/i,
    });
    const closeButton = closeButtons[closeButtons.length - 1];
    if (!closeButton) throw new Error('expected a close button');
    await user.click(closeButton);
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /open more menu/i })
      ).toHaveAttribute('aria-expanded', 'false');
    });
  });
});
