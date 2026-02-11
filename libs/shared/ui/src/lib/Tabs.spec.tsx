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

  it('renders nothing with empty tabs array', () => {
    const { container } = render(<Tabs tabs={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('handles single tab', () => {
    const singleTab = [
      { id: 'only', label: 'Only Tab', content: <div>Only Content</div> },
    ];
    render(<Tabs tabs={singleTab} />);

    expect(screen.getByText('Only Tab')).toBeInTheDocument();
    expect(screen.getByText('Only Content')).toBeInTheDocument();
  });

  describe('accessibility', () => {
    it('has role="tablist" on tab container', () => {
      render(<Tabs tabs={defaultTabs} />);
      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });

    it('has role="tab" on tab buttons', () => {
      render(<Tabs tabs={defaultTabs} />);
      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(3);
    });

    it('sets aria-selected correctly', () => {
      render(<Tabs tabs={defaultTabs} />);
      const tabs = screen.getAllByRole('tab');
      expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
      expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
      expect(tabs[2]).toHaveAttribute('aria-selected', 'false');
    });

    it('links tab to panel via aria-controls', () => {
      render(<Tabs tabs={defaultTabs} />);
      const tab = screen.getAllByRole('tab')[0];
      const panelId = tab.getAttribute('aria-controls');
      expect(panelId).toBeTruthy();
      expect(screen.getByRole('tabpanel')).toHaveAttribute('id', panelId);
    });

    it('has role="tabpanel" on content', () => {
      render(<Tabs tabs={defaultTabs} />);
      expect(screen.getByRole('tabpanel')).toBeInTheDocument();
    });

    it('links panel back to tab via aria-labelledby', () => {
      render(<Tabs tabs={defaultTabs} />);
      const tab = screen.getAllByRole('tab')[0];
      const panel = screen.getByRole('tabpanel');
      expect(panel).toHaveAttribute('aria-labelledby', tab.id);
    });

    it('sets tabIndex 0 for active tab and -1 for inactive', () => {
      render(<Tabs tabs={defaultTabs} />);
      const tabs = screen.getAllByRole('tab');
      expect(tabs[0]).toHaveAttribute('tabindex', '0');
      expect(tabs[1]).toHaveAttribute('tabindex', '-1');
      expect(tabs[2]).toHaveAttribute('tabindex', '-1');
    });

    it('moves to next tab on ArrowRight', () => {
      render(<Tabs tabs={defaultTabs} />);
      const tabs = screen.getAllByRole('tab');
      fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
      expect(screen.getByText('Content 2')).toBeInTheDocument();
      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
    });

    it('moves to previous tab on ArrowLeft', () => {
      render(<Tabs tabs={defaultTabs} defaultTab='tab2' />);
      const tabs = screen.getAllByRole('tab');
      fireEvent.keyDown(tabs[1], { key: 'ArrowLeft' });
      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(screen.queryByText('Content 2')).not.toBeInTheDocument();
    });

    it('wraps to first tab on ArrowRight from last', () => {
      render(<Tabs tabs={defaultTabs} defaultTab='tab3' />);
      const tabs = screen.getAllByRole('tab');
      fireEvent.keyDown(tabs[2], { key: 'ArrowRight' });
      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(screen.queryByText('Content 3')).not.toBeInTheDocument();
    });

    it('wraps to last tab on ArrowLeft from first', () => {
      render(<Tabs tabs={defaultTabs} />);
      const tabs = screen.getAllByRole('tab');
      fireEvent.keyDown(tabs[0], { key: 'ArrowLeft' });
      expect(screen.getByText('Content 3')).toBeInTheDocument();
      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
    });

    it('moves to first tab on Home key', () => {
      render(<Tabs tabs={defaultTabs} defaultTab='tab3' />);
      const tabs = screen.getAllByRole('tab');
      fireEvent.keyDown(tabs[2], { key: 'Home' });
      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(screen.queryByText('Content 3')).not.toBeInTheDocument();
    });

    it('moves to last tab on End key', () => {
      render(<Tabs tabs={defaultTabs} />);
      const tabs = screen.getAllByRole('tab');
      fireEvent.keyDown(tabs[0], { key: 'End' });
      expect(screen.getByText('Content 3')).toBeInTheDocument();
      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
    });
  });
});
