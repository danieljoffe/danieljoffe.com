import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Breadcrumb } from './Breadcrumb';

expect.extend(toHaveNoViolations);

describe('Breadcrumb', () => {
  const items = [
    { label: 'Home', href: '/' },
    { label: 'Projects', href: '/projects' },
    { label: 'Current' },
  ];

  it('renders all items', () => {
    render(<Breadcrumb items={items} />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Current')).toBeInTheDocument();
  });

  it('renders non-last items as links', () => {
    render(<Breadcrumb items={items} />);
    const homeLink = screen.getByText('Home').closest('a');
    expect(homeLink).toHaveAttribute('href', '/');
    const projectsLink = screen.getByText('Projects').closest('a');
    expect(projectsLink).toHaveAttribute('href', '/projects');
  });

  it('renders last item as plain text (not a link)', () => {
    render(<Breadcrumb items={items} />);
    const current = screen.getByText('Current');
    expect(current.closest('a')).toBeNull();
    expect(current).toHaveClass('font-medium');
  });

  it('renders separators between items', () => {
    const { container } = render(<Breadcrumb items={items} />);
    const separators = container.querySelectorAll('svg');
    expect(separators).toHaveLength(2);
  });

  it('renders no separator before first item', () => {
    const { container } = render(
      <Breadcrumb items={[{ label: 'Home', href: '/' }]} />
    );
    const separators = container.querySelectorAll('svg');
    expect(separators).toHaveLength(0);
  });

  it('applies custom className', () => {
    render(<Breadcrumb items={items} className='custom-class' />);
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('custom-class');
  });

  it('renders as a nav element', () => {
    render(<Breadcrumb items={items} />);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Breadcrumb items={items} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
