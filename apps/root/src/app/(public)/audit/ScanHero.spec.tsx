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
    render(<ScanHero scanCount={0} />);
    expect(
      screen.getByRole('heading', { name: /free website performance audit/i })
    ).toBeInTheDocument();
  });

  it('renders the URL input form', () => {
    render(<ScanHero scanCount={0} />);
    expect(
      screen.getByRole('textbox', { name: /website url/i })
    ).toBeInTheDocument();
  });

  it('renders the scan count when greater than zero', () => {
    render(<ScanHero scanCount={1234} />);
    expect(screen.getByText(/1,234 sites audited/i)).toBeInTheDocument();
  });

  it('omits the scan count when zero', () => {
    render(<ScanHero scanCount={0} />);
    expect(screen.queryByText(/sites audited/i)).not.toBeInTheDocument();
  });
});
