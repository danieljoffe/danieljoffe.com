import { render, screen } from '@testing-library/react';
import ScanHero from './ScanHero';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
}));

describe('ScanHero', () => {
  it('renders the hero heading', () => {
    render(
      <ScanHero
        scanCount={0}
        avgScore={null}
        topViolation={null}
        topViolationSlug={null}
      />
    );
    expect(
      screen.getByRole('heading', { name: /free website performance audit/i })
    ).toBeInTheDocument();
  });

  it('renders the URL input form', () => {
    render(
      <ScanHero
        scanCount={0}
        avgScore={null}
        topViolation={null}
        topViolationSlug={null}
      />
    );
    expect(
      screen.getByRole('textbox', { name: /website url/i })
    ).toBeInTheDocument();
  });

  it('renders the scan count when greater than zero', () => {
    render(
      <ScanHero
        scanCount={1234}
        avgScore={null}
        topViolation={null}
        topViolationSlug={null}
      />
    );
    expect(screen.getByText(/1,234/)).toBeInTheDocument();
  });

  it('omits the scan count when zero', () => {
    render(
      <ScanHero
        scanCount={0}
        avgScore={null}
        topViolation={null}
        topViolationSlug={null}
      />
    );
    expect(screen.queryByText(/sites audited/i)).not.toBeInTheDocument();
  });

  it('renders pain-point callout when data is available', () => {
    render(
      <ScanHero
        scanCount={500}
        avgScore={62}
        topViolation='Render-blocking resources'
        topViolationSlug='render-blocking-resources'
      />
    );
    expect(screen.getByText(/62\/100/)).toBeInTheDocument();
    expect(screen.getByText(/Render-blocking resources/)).toBeInTheDocument();
  });

  it('links top violation to guide page when slug is available', () => {
    render(
      <ScanHero
        scanCount={500}
        avgScore={62}
        topViolation='Render-blocking resources'
        topViolationSlug='render-blocking-resources'
      />
    );
    const link = screen.getByRole('link', {
      name: /Render-blocking resources/,
    });
    expect(link).toHaveAttribute(
      'href',
      '/audit/insights/violations/render-blocking-resources'
    );
  });

  it('omits pain-point callout when data is null', () => {
    render(
      <ScanHero
        scanCount={500}
        avgScore={null}
        topViolation={null}
        topViolationSlug={null}
      />
    );
    expect(screen.queryByText(/\/100/)).not.toBeInTheDocument();
  });
});
