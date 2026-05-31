import React from 'react';
import '@testing-library/jest-dom';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JobsFilter from '../JobsFilter';
import type { JobsFilterState } from '../types';

const baseFilters: JobsFilterState = {
  minScore: '',
  status: '',
  search: '',
  excludeLocations: '',
  onlyLocations: '',
};

describe('JobsFilter', () => {
  it('renders the search input with an accessible label', () => {
    render(
      <JobsFilter
        filters={baseFilters}
        onChange={() => undefined}
        sort='score'
        order='desc'
        handleSort={() => undefined}
      />
    );
    expect(
      screen.getByRole('textbox', { name: /search by title/i })
    ).toBeInTheDocument();
  });

  it('debounces search input and forwards a single onChange after 300ms', async () => {
    jest.useFakeTimers();
    const onChange = jest.fn();
    render(
      <JobsFilter
        filters={baseFilters}
        onChange={onChange}
        sort='score'
        order='desc'
        handleSort={() => undefined}
      />
    );

    const user = userEvent.setup({
      advanceTimers: (ms: number) => jest.advanceTimersByTime(ms),
    });
    await user.type(
      screen.getByRole('textbox', { name: /search by title/i }),
      'react'
    );

    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(400);
    });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'react' })
      );
    });
    jest.useRealTimers();
  });

  it('reflects the active min-score filter label', () => {
    render(
      <JobsFilter
        filters={{ ...baseFilters, minScore: '70' }}
        onChange={() => undefined}
        sort='score'
        order='desc'
        handleSort={() => undefined}
      />
    );
    expect(screen.getByText(/score 70\+/i)).toBeInTheDocument();
  });

  it('shows the status label when a status filter is active', () => {
    render(
      <JobsFilter
        filters={{ ...baseFilters, status: 'resume_draft' }}
        onChange={() => undefined}
        sort='score'
        order='desc'
        handleSort={() => undefined}
      />
    );
    expect(screen.getByText(/resume draft/i)).toBeInTheDocument();
  });

  it('uses "All statuses" when no status filter is selected', () => {
    render(
      <JobsFilter
        filters={baseFilters}
        onChange={() => undefined}
        sort='score'
        order='desc'
        handleSort={() => undefined}
      />
    );
    expect(screen.getByText(/all statuses/i)).toBeInTheDocument();
  });
});
