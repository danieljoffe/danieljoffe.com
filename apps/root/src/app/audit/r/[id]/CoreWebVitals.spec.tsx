import { render, screen } from '@testing-library/react';
import CoreWebVitals from './CoreWebVitals';

describe('CoreWebVitals', () => {
  const defaultProps = {
    fcpMs: 1250,
    lcpMs: 2100,
    tbtMs: 150,
    cls: 0.05,
    siMs: 3200,
  };

  it('renders all 5 metric labels', () => {
    render(<CoreWebVitals {...defaultProps} />);
    expect(screen.getByText('First Contentful Paint')).toBeInTheDocument();
    expect(screen.getByText('Largest Contentful Paint')).toBeInTheDocument();
    expect(screen.getByText('Total Blocking Time')).toBeInTheDocument();
    expect(screen.getByText('Cumulative Layout Shift')).toBeInTheDocument();
    expect(screen.getByText('Speed Index')).toBeInTheDocument();
  });

  it('formats FCP in seconds', () => {
    render(<CoreWebVitals {...defaultProps} />);
    expect(screen.getByText('1.3 s')).toBeInTheDocument();
  });

  it('formats LCP in seconds', () => {
    render(<CoreWebVitals {...defaultProps} />);
    expect(screen.getByText('2.1 s')).toBeInTheDocument();
  });

  it('formats TBT in milliseconds', () => {
    render(<CoreWebVitals {...defaultProps} />);
    expect(screen.getByText('150 ms')).toBeInTheDocument();
  });

  it('formats CLS as decimal', () => {
    render(<CoreWebVitals {...defaultProps} />);
    expect(screen.getByText('0.050')).toBeInTheDocument();
  });

  it('formats SI in seconds', () => {
    render(<CoreWebVitals {...defaultProps} />);
    expect(screen.getByText('3.2 s')).toBeInTheDocument();
  });

  it('shows Good indicator for passing metrics', () => {
    render(<CoreWebVitals {...defaultProps} />);
    // FCP 1250 < 1800 = good, LCP 2100 < 2500 = good, TBT 150 < 200 = good,
    // CLS 0.05 < 0.1 = good, SI 3200 < 3400 = good
    const goodIcons = screen.getAllByLabelText('Good');
    expect(goodIcons.length).toBe(5);
  });

  it('shows Poor indicator for failing metrics', () => {
    render(
      <CoreWebVitals
        fcpMs={5000}
        lcpMs={6000}
        tbtMs={800}
        cls={0.5}
        siMs={7000}
      />
    );
    const poorIcons = screen.getAllByLabelText('Poor');
    expect(poorIcons.length).toBe(5);
  });

  it('renders N/A for null values', () => {
    render(
      <CoreWebVitals
        fcpMs={null}
        lcpMs={null}
        tbtMs={null}
        cls={null}
        siMs={null}
      />
    );
    expect(screen.getAllByText('N/A')).toHaveLength(5);
  });

  it('renders section heading', () => {
    render(<CoreWebVitals {...defaultProps} />);
    expect(
      screen.getByRole('heading', { name: /core web vitals/i })
    ).toBeInTheDocument();
  });

  it('renders mobile context note by default', () => {
    render(<CoreWebVitals {...defaultProps} />);
    expect(
      screen.getByText(/simulated mobile conditions/i)
    ).toBeInTheDocument();
  });

  it('renders desktop context note when deviceMode is desktop', () => {
    render(<CoreWebVitals {...defaultProps} deviceMode='desktop' />);
    expect(
      screen.getByText(/simulated desktop conditions/i)
    ).toBeInTheDocument();
  });
});
