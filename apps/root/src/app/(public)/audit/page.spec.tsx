import { render, screen } from '@testing-library/react';
import AuditPage from './page';

jest.mock('next/headers', () => ({
  headers: jest.fn().mockResolvedValue({
    get: (key: string) => (key === 'host' ? 'localhost:3000' : null),
  }),
}));

const mockSummary = {
  totalScans: 42,
  uniqueDomains: 10,
  avgOverallScore: 65,
  topViolation: 'Render-blocking resources',
};

global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve(mockSummary),
}) as jest.Mock;

jest.mock('./ScanHero', () => ({
  __esModule: true,
  default: function ScanHero({
    scanCount,
    avgScore,
    topViolation,
  }: {
    scanCount: number;
    avgScore: number | null;
    topViolation: string | null;
  }) {
    return (
      <div data-testid='scan-hero'>
        count:{scanCount},avg:{avgScore},top:{topViolation}
      </div>
    );
  },
}));

jest.mock('./HowItWorks', () => ({
  __esModule: true,
  default: function HowItWorks() {
    return <div data-testid='how-it-works' />;
  },
}));

describe('Audit Page', () => {
  it('renders inside PageLayout wrapper', async () => {
    render(await AuditPage());
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main-content');
  });

  it('renders ScanHero with summary data', async () => {
    render(await AuditPage());
    expect(screen.getByTestId('scan-hero')).toHaveTextContent('count:42');
    expect(screen.getByTestId('scan-hero')).toHaveTextContent('avg:65');
    expect(screen.getByTestId('scan-hero')).toHaveTextContent(
      'top:Render-blocking resources'
    );
  });

  it('renders HowItWorks section', async () => {
    render(await AuditPage());
    expect(screen.getByTestId('how-it-works')).toBeInTheDocument();
  });
});
