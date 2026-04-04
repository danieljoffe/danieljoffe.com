import { render, screen } from '@testing-library/react';
import ReportPage from './page';

const mockScan = {
  id: 'test-uuid-1234',
  url: 'https://example.com',
  normalized_url: 'https://example.com',
  status: 'completed',
  created_at: '2026-01-01T00:00:00Z',
  completed_at: '2026-01-01T00:01:00Z',
  error_message: null as string | null,
  score_performance: 85,
  score_accessibility: 92,
  score_best_practices: 88,
  score_seo: 78,
  grade_overall: 'B',
  fcp_ms: 1250,
  lcp_ms: 2100,
  tbt_ms: 150,
  cls: 0.05,
  si_ms: 3200,
  page_title: 'Example Site',
  page_description: 'An example site',
  page_screenshot_url: null,
  source: 'organic',
  device_mode: 'mobile',
  paired_scan_id: null,
};

const mockIssues = [
  {
    id: 'issue-1',
    scan_id: 'test-uuid-1234',
    category: 'performance',
    severity: 'critical',
    title: 'Main content takes too long',
    description: 'LCP is slow.',
    impact: 'Users leave.',
    fix_difficulty: 'moderate',
    technical_detail: null,
    sort_order: 0,
  },
];

let currentMockScan = mockScan;

jest.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: table === 'scans' ? currentMockScan : null,
            error: null,
          }),
          order: jest.fn().mockResolvedValue({
            data: table === 'scan_issues' ? mockIssues : [],
            error: null,
          }),
        }),
      }),
    }),
  }),
}));

jest.mock('./ReportHeader', () => ({
  __esModule: true,
  default: function ReportHeader() {
    return <div data-testid='report-header' />;
  },
}));

jest.mock('./ScoreCards', () => ({
  __esModule: true,
  default: function ScoreCards() {
    return <div data-testid='score-cards' />;
  },
}));

jest.mock('./CoreWebVitals', () => ({
  __esModule: true,
  default: function CoreWebVitals() {
    return <div data-testid='core-web-vitals' />;
  },
}));

jest.mock('./IssueList', () => ({
  __esModule: true,
  default: function IssueList() {
    return <div data-testid='issue-list' />;
  },
}));

jest.mock('./CTASection', () => ({
  __esModule: true,
  default: function CTASection() {
    return <div data-testid='cta-section' />;
  },
}));

jest.mock('./ReportAnalytics', () => ({
  __esModule: true,
  default: function ReportAnalytics() {
    return null;
  },
}));

jest.mock('./DeviceTabs', () => ({
  __esModule: true,
  default: function DeviceTabs() {
    return null;
  },
}));

jest.mock('./ScanPending', () => ({
  __esModule: true,
  default: function ScanPending() {
    return <div data-testid='scan-pending' />;
  },
}));

jest.mock('./ScanFailed', () => ({
  __esModule: true,
  default: function ScanFailed() {
    return <div data-testid='scan-failed' />;
  },
}));

describe('Report Page', () => {
  const params = Promise.resolve({
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  });

  beforeEach(() => {
    currentMockScan = mockScan;
  });

  it('renders inside PageLayout wrapper', async () => {
    render(await ReportPage({ params }));
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main-content');
  });

  it('renders ReportHeader section', async () => {
    render(await ReportPage({ params }));
    expect(screen.getByTestId('report-header')).toBeInTheDocument();
  });

  it('renders ScoreCards section', async () => {
    render(await ReportPage({ params }));
    expect(screen.getByTestId('score-cards')).toBeInTheDocument();
  });

  it('renders CoreWebVitals section', async () => {
    render(await ReportPage({ params }));
    expect(screen.getByTestId('core-web-vitals')).toBeInTheDocument();
  });

  it('renders IssueList section', async () => {
    render(await ReportPage({ params }));
    expect(screen.getByTestId('issue-list')).toBeInTheDocument();
  });

  it('renders CTASection', async () => {
    render(await ReportPage({ params }));
    expect(screen.getByTestId('cta-section')).toBeInTheDocument();
  });

  it('renders ScanPending for pending scans', async () => {
    currentMockScan = { ...mockScan, status: 'pending' };
    render(await ReportPage({ params }));
    expect(screen.getByTestId('scan-pending')).toBeInTheDocument();
    expect(screen.queryByTestId('report-header')).not.toBeInTheDocument();
  });

  it('renders ScanPending for running scans', async () => {
    currentMockScan = { ...mockScan, status: 'running' };
    render(await ReportPage({ params }));
    expect(screen.getByTestId('scan-pending')).toBeInTheDocument();
  });

  it('renders ScanFailed for failed scans', async () => {
    currentMockScan = {
      ...mockScan,
      status: 'failed',
      error_message: 'Scan timed out after 90s',
    };
    render(await ReportPage({ params }));
    expect(screen.getByTestId('scan-failed')).toBeInTheDocument();
    expect(screen.queryByTestId('report-header')).not.toBeInTheDocument();
  });
});
