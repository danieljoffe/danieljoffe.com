import { render, screen, fireEvent } from '@testing-library/react';
import { Tabs } from './Tabs';

const defaultTabs = [
  { id: 'tab1', label: 'Tab 1', content: <div>Content 1</div> },
  { id: 'tab2', label: 'Tab 2', content: <div>Content 2</div> },
  { id: 'tab3', label: 'Tab 3', content: <div>Content 3</div> },
];

describe('Tabs', () => {
  it('renders all tab buttons', () => {
    render(<Tabs tabs={defaultTabs} />);
    expect(screen.getByText('Tab 1')).toBeInTheDocument();
    expect(screen.getByText('Tab 2')).toBeInTheDocument();
    expect(screen.getByText('Tab 3')).toBeInTheDocument();
  });

  it('renders first tab content by default', () => {
    render(<Tabs tabs={defaultTabs} />);
    expect(screen.getByText('Content 1')).toBeInTheDocument();
    expect(screen.queryByText('Content 2')).not.toBeInTheDocument();
  });

  it('renders specified defaultTab content', () => {
    render(<Tabs tabs={defaultTabs} defaultTab='tab2' />);
    expect(screen.getByText('Content 2')).toBeInTheDocument();
    expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
  });

  it('switches content when tab is clicked', () => {
    render(<Tabs tabs={defaultTabs} />);

    expect(screen.getByText('Content 1')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Tab 2'));

    expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
    expect(screen.getByText('Content 2')).toBeInTheDocument();
  });

  it('calls onChange when tab is clicked', () => {
    const handleChange = jest.fn();
    render(<Tabs tabs={defaultTabs} onChange={handleChange} />);

    fireEvent.click(screen.getByText('Tab 2'));

    expect(handleChange).toHaveBeenCalledWith('tab2');
  });

  it('applies active styles to selected tab', () => {
    render(<Tabs tabs={defaultTabs} />);
    const tab1Button = screen.getByText('Tab 1');
    const tab2Button = screen.getByText('Tab 2');

    expect(tab1Button).toHaveClass('border-accent', 'text-accent');
    expect(tab2Button).toHaveClass('border-transparent');
  });

  it('updates active styles when switching tabs', () => {
    render(<Tabs tabs={defaultTabs} />);

    fireEvent.click(screen.getByText('Tab 2'));

    const tab1Button = screen.getByText('Tab 1');
    const tab2Button = screen.getByText('Tab 2');

    expect(tab1Button).toHaveClass('border-transparent');
    expect(tab2Button).toHaveClass('border-accent', 'text-accent');
  });

  it('renders with empty tabs array', () => {
    const { container } = render(<Tabs tabs={[]} />);
    expect(container.querySelector('.flex.gap-1')).toBeInTheDocument();
  });

  it('handles single tab', () => {
    const singleTab = [
      { id: 'only', label: 'Only Tab', content: <div>Only Content</div> },
    ];
    render(<Tabs tabs={singleTab} />);

    expect(screen.getByText('Only Tab')).toBeInTheDocument();
    expect(screen.getByText('Only Content')).toBeInTheDocument();
  });
});
