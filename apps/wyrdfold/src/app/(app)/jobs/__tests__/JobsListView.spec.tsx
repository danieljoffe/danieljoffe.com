import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import JobsListView from '../JobsListView';

// Replace the heavy children with simple identifiable stubs so the spec
// can exercise the layout-switch logic without pulling in the table /
// mobile internals (those are covered in their own specs once authored).
jest.mock('../JobsListTable', () => ({
  __esModule: true,
  default: () => <div data-testid='jobs-list-table' />,
}));

jest.mock('../JobsListMobile', () => ({
  __esModule: true,
  default: () => <div data-testid='jobs-list-mobile' />,
}));

jest.mock('../JobsFilter', () => ({
  __esModule: true,
  default: () => <div data-testid='jobs-filter' />,
}));

const originalFetch = global.fetch;
beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ postings: [], total: 0 }),
  } as Response) as unknown as typeof fetch;
});
afterEach(() => {
  global.fetch = originalFetch;
});

function setMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }),
  });
}

const baseProps = {
  filters: { minScore: '', status: '', search: '' },
  onFiltersChange: () => undefined,
  selectedIds: new Set<string>(),
  onSelectionChange: () => undefined,
  refreshKey: 0,
  targetId: undefined,
  analysisTargetId: undefined,
};

describe('JobsListView', () => {
  it('renders the filter and the mobile list on narrow viewports', async () => {
    setMatchMedia(false);
    render(<JobsListView {...baseProps} />);
    expect(screen.getByTestId('jobs-filter')).toBeInTheDocument();
    expect(screen.getByTestId('jobs-list-mobile')).toBeInTheDocument();
    expect(screen.queryByTestId('jobs-list-table')).toBeNull();
  });

  it('renders the desktop table on wide viewports', async () => {
    setMatchMedia(true);
    render(<JobsListView {...baseProps} />);
    expect(screen.getByTestId('jobs-filter')).toBeInTheDocument();
    // Table is dynamically loaded — wait for it to mount.
    await waitFor(() => {
      expect(screen.getByTestId('jobs-list-table')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('jobs-list-mobile')).toBeNull();
  });
});
