import { render, screen } from '@testing-library/react';
import type { ScanIssue } from '@danieljoffe.com/shared-audit';
import IssueCard from './IssueCard';

const mockIssue: ScanIssue = {
  id: 'issue-1',
  scan_id: 'scan-1',
  category: 'performance',
  severity: 'critical',
  title: 'Main content takes too long to appear',
  description: 'Your page takes 4.2s to load.',
  impact: 'Pages with LCP over 4s lose 25% of visitors.',
  fix_difficulty: 'moderate',
  technical_detail: null,
  sort_order: 0,
};

describe('IssueCard', () => {
  it('renders the issue title', () => {
    render(<IssueCard issue={mockIssue} />);
    expect(
      screen.getByText('Main content takes too long to appear')
    ).toBeInTheDocument();
  });

  it('renders the description', () => {
    render(<IssueCard issue={mockIssue} />);
    expect(
      screen.getByText('Your page takes 4.2s to load.')
    ).toBeInTheDocument();
  });

  it('renders the impact text', () => {
    render(<IssueCard issue={mockIssue} />);
    expect(
      screen.getByText('Pages with LCP over 4s lose 25% of visitors.')
    ).toBeInTheDocument();
  });

  it('renders severity badge', () => {
    render(<IssueCard issue={mockIssue} />);
    expect(screen.getByText('critical')).toBeInTheDocument();
  });

  it('renders category badge', () => {
    render(<IssueCard issue={mockIssue} />);
    expect(screen.getByText('Performance')).toBeInTheDocument();
  });

  it('renders fix difficulty badge', () => {
    render(<IssueCard issue={mockIssue} />);
    expect(screen.getByText('moderate fix')).toBeInTheDocument();
  });

  it('does not render impact when null', () => {
    render(<IssueCard issue={{ ...mockIssue, impact: null }} />);
    expect(
      screen.queryByText('Pages with LCP over 4s lose 25% of visitors.')
    ).not.toBeInTheDocument();
  });

  it('does not render fix difficulty badge when null', () => {
    render(<IssueCard issue={{ ...mockIssue, fix_difficulty: null }} />);
    expect(screen.queryByText(/fix$/)).not.toBeInTheDocument();
  });
});
