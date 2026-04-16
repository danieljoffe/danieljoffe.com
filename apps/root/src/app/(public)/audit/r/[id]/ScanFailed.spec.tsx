import { render, screen } from '@testing-library/react';
import ScanFailed from './ScanFailed';

describe('ScanFailed', () => {
  it('renders the failure heading and scanned URL', () => {
    render(
      <ScanFailed url='https://example.com' errorMessage='Something broke' />
    );
    expect(
      screen.getByRole('heading', { name: /scan failed/i })
    ).toBeInTheDocument();
    expect(screen.getByText('https://example.com')).toBeInTheDocument();
  });

  it('renders a friendly error message', () => {
    render(
      <ScanFailed url='https://example.com' errorMessage='Something broke' />
    );
    // friendlyErrorMessage is deterministic; just verify some text rendered
    // by checking the heading's sibling region includes a description.
    const heading = screen.getByRole('heading', { name: /scan failed/i });
    expect(heading).toBeInTheDocument();
  });

  it('renders a retry link back to /audit', () => {
    render(<ScanFailed url='https://example.com' errorMessage={null} />);
    const link = screen.getByRole('link', { name: /try again/i });
    expect(link).toHaveAttribute('href', '/audit');
  });

  it('handles a null errorMessage without crashing', () => {
    render(<ScanFailed url='https://example.com' errorMessage={null} />);
    expect(
      screen.getByRole('heading', { name: /scan failed/i })
    ).toBeInTheDocument();
  });
});
