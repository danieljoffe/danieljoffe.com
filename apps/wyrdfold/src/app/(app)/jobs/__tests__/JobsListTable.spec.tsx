import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JobsListTable from '../JobsListTable';
import type { JobPosting, JobsSortColumn } from '../types';

// JobDetailPanel pulls in network + toast; stub it so this spec stays focused
// on the table's own sorting / selection / row-toggle behaviour.
jest.mock('../JobDetailPanel', () => ({
  __esModule: true,
  default: () => <div data-testid='job-detail-panel-stub' />,
}));

function makeJob(overrides: Partial<JobPosting> = {}): JobPosting {
  return {
    id: 'j-1',
    external_id: 'ext-1',
    source_id: 'src-1',
    title: 'Senior Frontend Engineer',
    company_name: 'Acme',
    location: 'Remote',
    absolute_url: null,
    score: 82,
    score_breakdown: null,
    scoring_status: 'complete',
    status: 'new',
    salary_text: null,
    greenhouse_updated_at: null,
    first_seen_at: '2026-01-01',
    created_at: '2026-01-01',
    ...overrides,
  };
}

const baseProps = {
  page: 1,
  setPage: () => undefined,
  totalPages: 1,
  sort: 'score' as JobsSortColumn,
  order: 'desc' as const,
  handleSort: () => undefined,
  sortIndicator: () => '',
  analysisTargetId: undefined,
  onRefetch: () => undefined,
};

describe('JobsListTable', () => {
  it('renders the loading skeleton when loading with no postings', () => {
    render(
      <JobsListTable
        {...baseProps}
        postings={[]}
        loading
        selectedIds={new Set()}
        onSelectionChange={() => undefined}
      />
    );
    expect(screen.getByLabelText(/loading jobs/i)).toBeInTheDocument();
  });

  it('renders the empty state when there are no postings', () => {
    render(
      <JobsListTable
        {...baseProps}
        postings={[]}
        loading={false}
        selectedIds={new Set()}
        onSelectionChange={() => undefined}
      />
    );
    expect(screen.getByText(/no jobs found/i)).toBeInTheDocument();
  });

  it('renders sortable column headers with accessible sort buttons', () => {
    render(
      <JobsListTable
        {...baseProps}
        postings={[makeJob()]}
        loading={false}
        selectedIds={new Set()}
        onSelectionChange={() => undefined}
      />
    );
    expect(
      screen.getByRole('button', { name: /sort by score/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /sort by title/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /sort by company/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /sort by posted/i })
    ).toBeInTheDocument();
  });

  it('marks the active column with aria-sort matching the order prop', () => {
    render(
      <JobsListTable
        {...baseProps}
        sort='title'
        order='asc'
        postings={[makeJob()]}
        loading={false}
        selectedIds={new Set()}
        onSelectionChange={() => undefined}
      />
    );
    const sortBtn = screen.getByRole('button', { name: /sort by title/i });
    const header = sortBtn.closest('th');
    expect(header).toHaveAttribute('aria-sort', 'ascending');
  });

  it('invokes handleSort with the column key when a header button is clicked', async () => {
    const handleSort = jest.fn();
    const user = userEvent.setup();
    render(
      <JobsListTable
        {...baseProps}
        handleSort={handleSort}
        postings={[makeJob()]}
        loading={false}
        selectedIds={new Set()}
        onSelectionChange={() => undefined}
      />
    );
    await user.click(screen.getByRole('button', { name: /sort by score/i }));
    expect(handleSort).toHaveBeenCalledWith('score');
  });

  it('toggles select-all on the page when the header checkbox is clicked', async () => {
    const onSelectionChange = jest.fn();
    const user = userEvent.setup();
    const postings = [makeJob(), makeJob({ id: 'j-2', title: 'Other Role' })];
    render(
      <JobsListTable
        {...baseProps}
        postings={postings}
        loading={false}
        selectedIds={new Set()}
        onSelectionChange={onSelectionChange}
      />
    );
    await user.click(
      screen.getByRole('checkbox', { name: /select all on this page/i })
    );
    const next = onSelectionChange.mock.calls.at(-1)?.[0] as Set<string>;
    expect(next.has('j-1')).toBe(true);
    expect(next.has('j-2')).toBe(true);
  });

  it('toggles individual row selection without expanding the row', async () => {
    const onSelectionChange = jest.fn();
    const user = userEvent.setup();
    render(
      <JobsListTable
        {...baseProps}
        postings={[makeJob()]}
        loading={false}
        selectedIds={new Set()}
        onSelectionChange={onSelectionChange}
      />
    );

    await user.click(
      screen.getByRole('checkbox', { name: /select senior frontend engineer/i })
    );
    expect(onSelectionChange).toHaveBeenCalled();
    // Row should NOT have expanded the detail panel.
    expect(
      screen.queryByTestId('job-detail-panel-stub')
    ).not.toBeInTheDocument();
  });

  it('expands the detail panel when a row is clicked and collapses on second click', async () => {
    const user = userEvent.setup();
    render(
      <JobsListTable
        {...baseProps}
        postings={[makeJob()]}
        loading={false}
        selectedIds={new Set()}
        onSelectionChange={() => undefined}
      />
    );

    const row = screen.getByRole('row', {
      name: /senior frontend engineer at acme/i,
    });
    await user.click(row);
    expect(screen.getByTestId('job-detail-panel-stub')).toBeInTheDocument();
    expect(row).toHaveAttribute('aria-expanded', 'true');

    await user.click(row);
    expect(
      screen.queryByTestId('job-detail-panel-stub')
    ).not.toBeInTheDocument();
  });

  it('marks all-on-page checkbox as checked when every posting is selected', () => {
    const postings = [makeJob(), makeJob({ id: 'j-2', title: 'Other Role' })];
    render(
      <JobsListTable
        {...baseProps}
        postings={postings}
        loading={false}
        selectedIds={new Set(['j-1', 'j-2'])}
        onSelectionChange={() => undefined}
      />
    );
    expect(
      screen.getByRole('checkbox', { name: /select all on this page/i })
    ).toBeChecked();
  });

  it('renders an external link for postings with absolute_url', () => {
    render(
      <JobsListTable
        {...baseProps}
        postings={[makeJob({ absolute_url: 'https://example.com/job' })]}
        loading={false}
        selectedIds={new Set()}
        onSelectionChange={() => undefined}
      />
    );
    const link = screen.getByRole('link', {
      name: /senior frontend engineer/i,
    });
    expect(link).toHaveAttribute('href', 'https://example.com/job');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders the Discovered badge for manually-sourced jobs', () => {
    render(
      <JobsListTable
        {...baseProps}
        postings={[
          makeJob({ source_id: '00000000-0000-4000-a000-000000000001' }),
        ]}
        loading={false}
        selectedIds={new Set()}
        onSelectionChange={() => undefined}
      />
    );
    const row = screen.getByRole('row', {
      name: /senior frontend engineer at acme/i,
    });
    expect(within(row).getByText(/discovered/i)).toBeInTheDocument();
  });
});
