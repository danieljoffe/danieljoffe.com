import { render, screen } from '@testing-library/react';
import type { ScanIssue } from '@danieljoffe.com/shared-audit';
import IssueList from './IssueList';

function makeIssue(
  overrides: Partial<ScanIssue> & Pick<ScanIssue, 'id' | 'severity'>
): ScanIssue {
  return {
    scan_id: 'scan-1',
    category: 'performance',
    title: `Issue ${overrides.id}`,
    description: 'desc',
    impact: null,
    fix_difficulty: 'moderate',
    technical_detail: null,
    sort_order: 0,
    ...overrides,
  };
}

describe('IssueList', () => {
  it('returns null when no issues', () => {
    const { container } = render(<IssueList issues={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the heading and summary counts', () => {
    const issues: ScanIssue[] = [
      makeIssue({ id: 'i1', severity: 'critical' }),
      makeIssue({ id: 'i2', severity: 'warning' }),
      makeIssue({ id: 'i3', severity: 'info' }),
    ];
    render(<IssueList issues={issues} />);
    expect(
      screen.getByRole('heading', { name: /issues found/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/3 issues: 1 critical, 1 warnings, 1 informational/i)
    ).toBeInTheDocument();
  });

  it('renders all issues without gating', () => {
    const issues: ScanIssue[] = Array.from({ length: 5 }).map((_, i) =>
      makeIssue({ id: `i${i}`, severity: 'warning' })
    );
    render(<IssueList issues={issues} />);
    expect(screen.getByText('Issue i0')).toBeInTheDocument();
    expect(screen.getByText('Issue i1')).toBeInTheDocument();
    expect(screen.getByText('Issue i2')).toBeInTheDocument();
    expect(screen.getByText('Issue i3')).toBeInTheDocument();
    expect(screen.getByText('Issue i4')).toBeInTheDocument();
  });
});
