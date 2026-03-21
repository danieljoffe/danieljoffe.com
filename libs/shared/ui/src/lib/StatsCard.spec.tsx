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
    const { container } = render(<StatsCard title='Revenue' value='$12k' />);
    expect(container.querySelector('.text-success')).not.toBeInTheDocument();
    expect(container.querySelector('.text-error')).not.toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    render(<StatsCard title='Revenue' value='$12k' icon={<span>icon</span>} />);
    expect(screen.getByText('icon')).toBeInTheDocument();
  });

  it('treats zero change as positive', () => {
    render(<StatsCard title='Revenue' value='$12k' change={0} />);
    expect(screen.getByText('+0%')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <StatsCard title='Revenue' value='$12k' className='custom-class' />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
