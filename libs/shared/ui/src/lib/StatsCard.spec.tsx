import { render, screen } from '@testing-library/react';
import { StatsCard } from './StatsCard';

describe('StatsCard', () => {
  it('renders title and value', () => {
    render(<StatsCard title='Revenue' value='$12,345' />);
    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('$12,345')).toBeInTheDocument();
  });

  it('renders numeric value', () => {
    render(<StatsCard title='Users' value={1234} />);
    expect(screen.getByText('1234')).toBeInTheDocument();
  });

  it('renders positive change with + prefix', () => {
    render(<StatsCard title='Revenue' value='$12k' change={12} />);
    expect(screen.getByText('+12%')).toBeInTheDocument();
  });

  it('renders negative change without + prefix', () => {
    render(<StatsCard title='Revenue' value='$12k' change={-5} />);
    expect(screen.getByText('-5%')).toBeInTheDocument();
  });

  it('renders change label when provided', () => {
    render(
      <StatsCard
        title='Revenue'
        value='$12k'
        change={12}
        changeLabel='vs last month'
      />
    );
    expect(screen.getByText('vs last month')).toBeInTheDocument();
  });

  it('does not render change section when change is undefined', () => {
    render(<StatsCard title='Revenue' value='$12k' />);
    expect(screen.queryByText(/[+-]\d+%/)).not.toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    render(<StatsCard title='Revenue' value='$12k' icon={<span>icon</span>} />);
    expect(screen.getByText('icon')).toBeInTheDocument();
  });

  it('treats zero change as positive', () => {
    render(<StatsCard title='Revenue' value='$12k' change={0} />);
    expect(screen.getByText('+0%')).toBeInTheDocument();
  });

  it('renders custom change unit', () => {
    render(
      <StatsCard
        title='Avg days'
        value='6d'
        change={-1.2}
        changeUnit='d'
        invertChange
      />
    );
    expect(screen.getByText('-1.2d')).toBeInTheDocument();
  });

  it('inverts color semantics when invertChange is set', () => {
    const { container } = render(
      <StatsCard title='Avg days' value='6d' change={-2} invertChange />
    );
    // change=-2 with invertChange=true → good → success color
    const changeText = container.querySelector('.text-success');
    expect(changeText).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <StatsCard title='Revenue' value='$12k' className='custom-class' />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
