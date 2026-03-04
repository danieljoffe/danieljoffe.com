import { render, screen } from '@testing-library/react';
import ReportHeader from './ReportHeader';

describe('ReportHeader', () => {
  const defaultProps = {
    scanId: '123e4567-e89b-12d3-a456-426614174000',
    url: 'https://example.com',
    pageTitle: 'Example Site',
    screenshotUrl: null,
    gradeOverall: 'B' as const,
    completedAt: '2026-02-19T12:00:00Z',
  };

  it('renders the page title as heading', () => {
    render(<ReportHeader {...defaultProps} />);
    expect(
      screen.getByRole('heading', { name: /example site/i })
    ).toBeInTheDocument();
  });

  it('renders URL when no page title', () => {
    render(<ReportHeader {...defaultProps} pageTitle={null} />);
    expect(
      screen.getByRole('heading', { name: /https:\/\/example\.com/i })
    ).toBeInTheDocument();
  });

  it('renders the URL below the title', () => {
    render(<ReportHeader {...defaultProps} />);
    expect(screen.getByText('https://example.com')).toBeInTheDocument();
  });

  it('renders the grade badge with correct grade letter', () => {
    render(<ReportHeader {...defaultProps} />);
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('Good')).toBeInTheDocument();
  });

  it('renders formatted scan date', () => {
    render(<ReportHeader {...defaultProps} />);
    expect(screen.getByText(/scanned feb 19, 2026/i)).toBeInTheDocument();
  });

  it('renders back link to /audit', () => {
    render(<ReportHeader {...defaultProps} />);
    const link = screen.getByRole('link', { name: /new audit/i });
    expect(link).toHaveAttribute('href', '/audit');
  });

  it('renders placeholder icon when no screenshot', () => {
    const { container } = render(<ReportHeader {...defaultProps} />);
    expect(container.querySelector('img')).not.toBeInTheDocument();
  });

  it('renders screenshot when URL provided', () => {
    render(
      <ReportHeader
        {...defaultProps}
        screenshotUrl='https://storage.example.com/screenshot.png'
      />
    );
    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toContain(
      encodeURIComponent('https://storage.example.com/screenshot.png')
    );
  });

  it('renders mobile device label by default', () => {
    render(<ReportHeader {...defaultProps} />);
    expect(screen.getByText('Tested on Mobile (4G)')).toBeInTheDocument();
  });

  it('renders desktop device label when deviceMode is desktop', () => {
    render(<ReportHeader {...defaultProps} deviceMode='desktop' />);
    expect(
      screen.getByText('Tested on Desktop (Broadband)')
    ).toBeInTheDocument();
  });
});
