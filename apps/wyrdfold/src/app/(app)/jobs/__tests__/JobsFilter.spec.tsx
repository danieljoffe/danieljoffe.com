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

  it('debounces search input and forwards a single onChange after 600ms', async () => {
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

    // 500ms is still inside the debounce window — no call yet.
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(onChange).not.toHaveBeenCalled();

    // Crossing 600ms fires it.
    act(() => {
      jest.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'react' })
      );
    });
    jest.useRealTimers();
  });

  it('reflects the active min-score filter label on the pill', () => {
    render(
      <JobsFilter
        filters={{ ...baseFilters, minScore: '70' }}
        onChange={() => undefined}
        sort='score'
        order='desc'
        handleSort={() => undefined}
      />
    );
    // Matches both the pill (a Dropdown trigger button) and the chip row.
    // Querying by button role pins us to the pill — the chip itself is a
    // span; only its remove ``×`` is a button (and has a different name).
    expect(
      screen.getByRole('button', { name: /score 70\+/i })
    ).toBeInTheDocument();
  });

  it('shows the status label on the pill when a status filter is active', () => {
    render(
      <JobsFilter
        filters={{ ...baseFilters, status: 'resume_draft' }}
        onChange={() => undefined}
        sort='score'
        order='desc'
        handleSort={() => undefined}
      />
    );
    expect(
      screen.getByRole('button', { name: /resume draft/i })
    ).toBeInTheDocument();
  });

  it('renders active-filter chips with a Clear all link when 2+ filters are set', async () => {
    const onChange = jest.fn();
    render(
      <JobsFilter
        filters={{
          ...baseFilters,
          minScore: '70',
          status: 'applied',
          onlyLocations: 'Remote',
        }}
        onChange={onChange}
        sort='score'
        order='desc'
        handleSort={() => undefined}
      />
    );

    const region = screen.getByRole('region', { name: /active filters/i });
    expect(region).toBeInTheDocument();
    // Three chips → Clear all is visible.
    const clearAll = screen.getByRole('button', { name: /clear all/i });
    await userEvent.setup().click(clearAll);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        search: '',
        minScore: '',
        status: '',
        onlyLocations: '',
        excludeLocations: '',
      })
    );
  });

  it('removes a single filter via its chip × button', async () => {
    const onChange = jest.fn();
    render(
      <JobsFilter
        filters={{ ...baseFilters, minScore: '70' }}
        onChange={onChange}
        sort='score'
        order='desc'
        handleSort={() => undefined}
      />
    );

    const removeBtn = screen.getByRole('button', {
      name: /remove minscore filter/i,
    });
    await userEvent.setup().click(removeBtn);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ minScore: '' })
    );
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
