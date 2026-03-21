import { render, screen } from '@testing-library/react';
import AuditPage from './page';

jest.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: () => ({
    from: () => ({
      select: () => ({
        eq: jest.fn().mockResolvedValue({ count: 42 }),
      }),
    }),
  }),
}));

jest.mock('./ScanHero', () => ({
  __esModule: true,
  default: function ScanHero({ scanCount }: { scanCount: number }) {
    return <div data-testid='scan-hero'>count:{scanCount}</div>;
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

  it('renders ScanHero with scan count', async () => {
    render(await AuditPage());
    expect(screen.getByTestId('scan-hero')).toHaveTextContent('count:42');
  });

  it('renders HowItWorks section', async () => {
    render(await AuditPage());
    expect(screen.getByTestId('how-it-works')).toBeInTheDocument();
  });
});
