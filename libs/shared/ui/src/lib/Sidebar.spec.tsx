import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from './Sidebar';

const items = [
  { id: 'home', label: 'Home' },
  { id: 'settings', label: 'Settings', badge: 3 },
  {
    id: 'projects',
    label: 'Projects',
    children: [
      { id: 'proj-a', label: 'Project A' },
      { id: 'proj-b', label: 'Project B' },
    ],
  },
];

describe('Sidebar', () => {
  it('renders all top-level items', () => {
    render(<Sidebar items={items} />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
  });

  it('renders badge values', () => {
    render(<Sidebar items={items} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('calls onSelect when item is clicked', () => {
    const onSelect = jest.fn();
    render(<Sidebar items={items} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Home'));
    expect(onSelect).toHaveBeenCalledWith('home');
  });

  it('highlights active item', () => {
    render(<Sidebar items={items} activeId='home' />);
    expect(screen.getByText('Home').closest('button')).toHaveClass(
      'bg-brand-50'
    );
  });

  it('does not show children initially', () => {
    render(<Sidebar items={items} />);
    expect(screen.queryByText('Project A')).not.toBeInTheDocument();
  });

  it('expands children when parent is clicked', () => {
    render(<Sidebar items={items} />);
    fireEvent.click(screen.getByText('Projects'));
    expect(screen.getByText('Project A')).toBeInTheDocument();
    expect(screen.getByText('Project B')).toBeInTheDocument();
  });

  it('collapses children when parent is clicked again', () => {
    render(<Sidebar items={items} />);
    fireEvent.click(screen.getByText('Projects'));
    fireEvent.click(screen.getByText('Projects'));
    expect(screen.queryByText('Project A')).not.toBeInTheDocument();
  });

  it('renders header when provided', () => {
    render(<Sidebar items={items} header={<div>My App</div>} />);
    expect(screen.getByText('My App')).toBeInTheDocument();
  });

  it('renders footer when provided', () => {
    render(<Sidebar items={items} footer={<div>v1.0</div>} />);
    expect(screen.getByText('v1.0')).toBeInTheDocument();
  });

  it('applies collapsed width', () => {
    const { container } = render(<Sidebar items={items} collapsed />);
    expect(container.querySelector('.w-16')).toBeInTheDocument();
  });

  it('applies expanded width by default', () => {
    const { container } = render(<Sidebar items={items} />);
    const aside = container.querySelector('aside');
    expect(aside).toHaveClass('w-48', 'md:w-60');
  });

  it('applies motion-reduce:transition-none to sidebar container', () => {
    const { container } = render(<Sidebar items={items} />);
    const aside = container.querySelector('aside');
    expect(aside).toHaveClass('motion-reduce:transition-none');
  });

  it('applies motion-reduce:transition-none to sidebar item buttons', () => {
    render(<Sidebar items={items} />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toHaveClass('motion-reduce:transition-none');
    });
  });

  // --- focus-visible styles on sidebar buttons ---

  it('applies focus-visible ring classes on sidebar buttons', () => {
    render(<Sidebar items={items} />);
    const homeButton = screen.getByText('Home').closest('button')!;
    expect(homeButton.className).toContain('focus-visible:ring-2');
  });

  it('applies focus-visible ring classes on child items', () => {
    render(<Sidebar items={items} />);
    fireEvent.click(screen.getByText('Projects'));
    const childButton = screen.getByText('Project A').closest('button')!;
    expect(childButton.className).toContain('focus-visible:ring-2');
  });

  it('hides labels and children when collapsed', () => {
    render(<Sidebar items={items} collapsed />);
    expect(screen.queryByText('Home')).not.toBeInTheDocument();
    expect(screen.queryByText('3')).not.toBeInTheDocument();
  });
});
