import { render, screen } from '@testing-library/react';
import DeltaIndicator from './DeltaIndicator';
import type { Delta } from './calcDelta';

describe('DeltaIndicator', () => {
  const fmt = (n: number) => `${n}`;

  it('renders N/A for unknown direction', () => {
    const delta: Delta = { delta: null, direction: 'unknown' };
    render(<DeltaIndicator delta={delta} formatValue={fmt} />);
    expect(screen.getByText('N/A')).toBeInTheDocument();
    expect(
      screen.getByLabelText('No comparison available')
    ).toBeInTheDocument();
  });

  it('renders N/A when delta is null even with a meaningful direction', () => {
    const delta: Delta = { delta: null, direction: 'improved' };
    render(<DeltaIndicator delta={delta} formatValue={fmt} />);
    expect(screen.getByText('N/A')).toBeInTheDocument();
    expect(
      screen.getByLabelText('No comparison available')
    ).toBeInTheDocument();
  });

  it('renders unchanged state', () => {
    const delta: Delta = { delta: 0, direction: 'unchanged' };
    render(<DeltaIndicator delta={delta} formatValue={fmt} />);
    expect(screen.getByLabelText('Unchanged')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders improved state with positive delta', () => {
    const delta: Delta = { delta: 10, direction: 'improved' };
    render(<DeltaIndicator delta={delta} formatValue={fmt} />);
    const el = screen.getByLabelText('Improved by 10');
    expect(el).toBeInTheDocument();
    expect(el.textContent).toContain('+');
    expect(el.textContent).toContain('10');
  });

  it('renders regressed state with negative delta', () => {
    const delta: Delta = { delta: -5, direction: 'regressed' };
    render(<DeltaIndicator delta={delta} formatValue={fmt} />);
    const el = screen.getByLabelText('Regressed by 5');
    expect(el).toBeInTheDocument();
    expect(el.textContent).toContain('-5');
  });

  it('renders improved state with negative delta (CWV: lower is better)', () => {
    const delta: Delta = { delta: -200, direction: 'improved' };
    render(<DeltaIndicator delta={delta} formatValue={fmt} />);
    expect(screen.getByLabelText('Improved by 200')).toBeInTheDocument();
  });

  it('renders regressed state with positive delta (CWV)', () => {
    const delta: Delta = { delta: 300, direction: 'regressed' };
    render(<DeltaIndicator delta={delta} formatValue={fmt} />);
    const el = screen.getByLabelText('Regressed by 300');
    expect(el).toBeInTheDocument();
    expect(el.textContent).toContain('+');
  });

  it('applies custom className', () => {
    const delta: Delta = { delta: null, direction: 'unknown' };
    render(
      <DeltaIndicator
        delta={delta}
        formatValue={fmt}
        className='custom-class'
      />
    );
    expect(screen.getByLabelText('No comparison available')).toHaveClass(
      'custom-class'
    );
  });

  it('handles undefined className without error', () => {
    const delta: Delta = { delta: 0, direction: 'unchanged' };
    render(<DeltaIndicator delta={delta} formatValue={fmt} />);
    expect(screen.getByLabelText('Unchanged')).toBeInTheDocument();
  });

  it('uses the formatValue callback for display', () => {
    const delta: Delta = { delta: 15, direction: 'improved' };
    const pctFmt = (n: number) => `${n}%`;
    render(<DeltaIndicator delta={delta} formatValue={pctFmt} />);
    const el = screen.getByLabelText('Improved by 15%');
    expect(el.textContent).toContain('15%');
  });
});
