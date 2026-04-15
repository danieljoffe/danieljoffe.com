import { render, screen } from '@testing-library/react';
import StatsRow from './StatsRow';

describe('StatsRow', () => {
  it('renders each stat label and value', () => {
    render(
      <StatsRow
        stats={[
          { label: 'Total Scans', value: 42 },
          { label: 'Scans Today', value: 5 },
          { label: 'Total Leads', value: 10 },
          { label: 'Conversion Rate', value: '25%' },
        ]}
      />
    );

    expect(screen.getByText('Total Scans')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Scans Today')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Conversion Rate')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
  });

  it('renders optional subtitle when provided', () => {
    render(
      <StatsRow
        stats={[
          {
            label: 'Total Scans',
            value: 42,
            subtitle: 'since launch',
          },
        ]}
      />
    );

    expect(screen.getByText('since launch')).toBeInTheDocument();
  });

  it('renders an empty grid with no stats', () => {
    const { container } = render(<StatsRow stats={[]} />);
    expect(container.firstChild).toBeInTheDocument();
    expect(screen.queryByText(/scans/i)).not.toBeInTheDocument();
  });
});
