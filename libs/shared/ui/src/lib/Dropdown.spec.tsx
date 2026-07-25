import { render, screen, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Button } from './Button';
import { Dropdown, type DropdownTriggerProps } from './Dropdown';

expect.extend(toHaveNoViolations);

// Mock requestAnimationFrame to run callbacks synchronously in tests
beforeEach(() => {
  jest
    .spyOn(window, 'requestAnimationFrame')
    .mockImplementation((cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
});

afterEach(() => {
  jest.restoreAllMocks();
});

const items = [
  { label: 'Edit', onClick: () => {} },
  { label: 'Delete', onClick: () => {}, danger: true },
];

describe('Dropdown', () => {
  it('renders the trigger', () => {
    render(<Dropdown trigger={<span>Menu</span>} items={items} />);
    expect(screen.getByText('Menu')).toBeInTheDocument();
  });

  it('does not show items initially', () => {
    render(<Dropdown trigger={<span>Menu</span>} items={items} />);
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
  });

  it('shows items when trigger is clicked', () => {
    render(<Dropdown trigger={<span>Menu</span>} items={items} />);
    fireEvent.click(screen.getByText('Menu'));
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('hides items when trigger is clicked again', () => {
    render(<Dropdown trigger={<span>Menu</span>} items={items} />);
    fireEvent.click(screen.getByText('Menu'));
    fireEvent.click(screen.getByText('Menu'));
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
  });

  it('calls onClick and closes when item is clicked', () => {
    const onClick = jest.fn();
    render(
      <Dropdown
        trigger={<span>Menu</span>}
        items={[{ label: 'Action', onClick }]}
      />
    );
    fireEvent.click(screen.getByText('Menu'));
    fireEvent.click(screen.getByText('Action'));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Action')).not.toBeInTheDocument();
  });

  it('renders divider items', () => {
    render(
      <Dropdown
        trigger={<span>Menu</span>}
        items={[
          { label: 'Edit', onClick: jest.fn() },
          { label: '', divider: true },
          { label: 'Delete', onClick: jest.fn() },
        ]}
      />
    );
    fireEvent.click(screen.getByText('Menu'));
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('renders href items as links', () => {
    render(
      <Dropdown
        trigger={<span>Menu</span>}
        items={[{ label: 'Docs', href: '/docs' }]}
      />
    );
    fireEvent.click(screen.getByText('Menu'));
    const link = screen.getByRole('menuitem', { name: 'Docs' });
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/docs');
    expect(link).not.toHaveAttribute('target');
  });

  it('opens external href items in a new tab with safe rel', () => {
    render(
      <Dropdown
        trigger={<span>Menu</span>}
        items={[
          {
            label: 'Documentation',
            href: 'https://example.com',
            external: true,
          },
        ]}
      />
    );
    fireEvent.click(screen.getByText('Menu'));
    const link = screen.getByRole('menuitem', { name: 'Documentation' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('fires onClick and closes when an href item is activated with Enter', () => {
    const onClick = jest.fn();
    render(
      <Dropdown
        trigger={<span>Menu</span>}
        items={[{ label: 'Docs', href: '/docs', onClick }]}
      />
    );
    fireEvent.click(screen.getByText('Menu'));
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Enter' });
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('renders disabled items', () => {
    render(
      <Dropdown
        trigger={<span>Menu</span>}
        items={[{ label: 'Disabled', disabled: true }]}
      />
    );
    fireEvent.click(screen.getByText('Menu'));
    expect(screen.getByRole('menuitem', { name: 'Disabled' })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
  });

  it('applies danger styles to danger items', () => {
    render(<Dropdown trigger={<span>Menu</span>} items={items} />);
    fireEvent.click(screen.getByText('Menu'));
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveClass(
      'text-error'
    );
  });

  it('closes when clicking outside', () => {
    render(
      <div>
        <Dropdown trigger={<span>Menu</span>} items={items} />
        <span>Outside</span>
      </div>
    );
    fireEvent.click(screen.getByText('Menu'));
    expect(screen.getByText('Edit')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByText('Outside'));
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
  });

  // --- focus-visible styles on menu items ---

  it('applies focus-visible ring classes on menu items', () => {
    render(<Dropdown trigger={<span>Menu</span>} items={items} />);
    fireEvent.click(screen.getByText('Menu'));
    const editButton = screen.getByRole('menuitem', { name: 'Edit' });
    expect(editButton.className).toContain('focus-visible:ring-2');
  });

  it('applies right alignment when specified', () => {
    render(
      <Dropdown trigger={<span>Menu</span>} items={items} align='right' />
    );
    fireEvent.click(screen.getByText('Menu'));
    const dropdown = screen.getByText('Edit').closest('.right-0');
    expect(dropdown).toBeInTheDocument();
  });

  describe('ARIA attributes', () => {
    it('has aria-haspopup on trigger', () => {
      render(<Dropdown trigger={<span>Menu</span>} items={items} />);
      const trigger = screen.getByRole('button', { name: 'Menu' });
      expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    });

    it('has aria-expanded=false when closed', () => {
      render(<Dropdown trigger={<span>Menu</span>} items={items} />);
      const trigger = screen.getByRole('button', { name: 'Menu' });
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it('has aria-expanded=true when open', () => {
      render(<Dropdown trigger={<span>Menu</span>} items={items} />);
      const trigger = screen.getByRole('button', { name: 'Menu' });
      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });

    it('links trigger to menu via aria-controls', () => {
      render(<Dropdown trigger={<span>Menu</span>} items={items} />);
      const trigger = screen.getByRole('button', { name: 'Menu' });
      expect(trigger).not.toHaveAttribute('aria-controls');
      fireEvent.click(trigger);
      const menuId = trigger.getAttribute('aria-controls');
      expect(menuId).toBeTruthy();
      expect(screen.getByRole('menu')).toHaveAttribute('id', menuId);
    });

    it('has role="menu" on the dropdown container', () => {
      render(<Dropdown trigger={<span>Menu</span>} items={items} />);
      fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('has role="menuitem" on each item', () => {
      render(<Dropdown trigger={<span>Menu</span>} items={items} />);
      fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems).toHaveLength(2);
    });

    it('has role="separator" on divider items', () => {
      render(
        <Dropdown
          trigger={<span>Menu</span>}
          items={[
            { label: 'Edit', onClick: jest.fn() },
            { label: '', divider: true },
            { label: 'Delete', onClick: jest.fn() },
          ]}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
      expect(screen.getByRole('separator')).toBeInTheDocument();
    });

    it('has aria-labelledby linking menu to trigger', () => {
      render(<Dropdown trigger={<span>Menu</span>} items={items} />);
      const trigger = screen.getByRole('button', { name: 'Menu' });
      fireEvent.click(trigger);
      const menu = screen.getByRole('menu');
      expect(menu).toHaveAttribute('aria-labelledby', trigger.id);
    });
  });

  describe('Keyboard navigation', () => {
    it('opens menu on ArrowDown and focuses first item', () => {
      render(<Dropdown trigger={<span>Menu</span>} items={items} />);
      const trigger = screen.getByRole('button', { name: 'Menu' });
      fireEvent.keyDown(trigger, { key: 'ArrowDown' });
      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(screen.getAllByRole('menuitem')[0]).toHaveFocus();
    });

    it('opens menu on ArrowUp', () => {
      render(<Dropdown trigger={<span>Menu</span>} items={items} />);
      const trigger = screen.getByRole('button', { name: 'Menu' });
      fireEvent.keyDown(trigger, { key: 'ArrowUp' });
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('navigates down with ArrowDown', () => {
      render(<Dropdown trigger={<span>Menu</span>} items={items} />);
      fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems[0]).toHaveFocus();
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
      expect(menuItems[1]).toHaveFocus();
    });

    it('wraps around when navigating past last item', () => {
      render(<Dropdown trigger={<span>Menu</span>} items={items} />);
      fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
      const menuItems = screen.getAllByRole('menuitem');
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
      expect(menuItems[1]).toHaveFocus();
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
      expect(menuItems[0]).toHaveFocus();
    });

    it('navigates up with ArrowUp', () => {
      render(<Dropdown trigger={<span>Menu</span>} items={items} />);
      fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
      const menuItems = screen.getAllByRole('menuitem');
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
      expect(menuItems[1]).toHaveFocus();
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowUp' });
      expect(menuItems[0]).toHaveFocus();
    });

    it('wraps around when navigating before first item', () => {
      render(<Dropdown trigger={<span>Menu</span>} items={items} />);
      fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
      const menuItems = screen.getAllByRole('menuitem');
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowUp' });
      expect(menuItems[1]).toHaveFocus();
    });

    it('closes menu on Escape and returns focus to trigger', () => {
      render(<Dropdown trigger={<span>Menu</span>} items={items} />);
      const trigger = screen.getByRole('button', { name: 'Menu' });
      fireEvent.click(trigger);
      expect(screen.getByRole('menu')).toBeInTheDocument();
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });

    it('selects item with Enter', () => {
      const onClick = jest.fn();
      render(
        <Dropdown
          trigger={<span>Menu</span>}
          items={[{ label: 'Action', onClick }]}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'Enter' });
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('selects item with Space', () => {
      const onClick = jest.fn();
      render(
        <Dropdown
          trigger={<span>Menu</span>}
          items={[{ label: 'Action', onClick }]}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
      fireEvent.keyDown(screen.getByRole('menu'), { key: ' ' });
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('jumps to first item with Home', () => {
      render(<Dropdown trigger={<span>Menu</span>} items={items} />);
      fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
      const menuItems = screen.getAllByRole('menuitem');
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
      expect(menuItems[1]).toHaveFocus();
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'Home' });
      expect(menuItems[0]).toHaveFocus();
    });

    it('jumps to last item with End', () => {
      render(<Dropdown trigger={<span>Menu</span>} items={items} />);
      fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems[0]).toHaveFocus();
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'End' });
      expect(menuItems[1]).toHaveFocus();
    });

    it('skips disabled items during navigation', () => {
      render(
        <Dropdown
          trigger={<span>Menu</span>}
          items={[
            { label: 'First', onClick: jest.fn() },
            { label: 'Disabled', disabled: true },
            { label: 'Last', onClick: jest.fn() },
          ]}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems[0]).toHaveFocus();
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
      expect(menuItems[2]).toHaveFocus();
    });

    it('skips divider items during navigation', () => {
      render(
        <Dropdown
          trigger={<span>Menu</span>}
          items={[
            { label: 'First', onClick: jest.fn() },
            { label: '', divider: true },
            { label: 'Last', onClick: jest.fn() },
          ]}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems[0]).toHaveFocus();
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
      expect(menuItems[1]).toHaveFocus();
    });

    it('closes menu on Tab', () => {
      render(<Dropdown trigger={<span>Menu</span>} items={items} />);
      const trigger = screen.getByRole('button', { name: 'Menu' });
      fireEvent.click(trigger);
      expect(screen.getByRole('menu')).toBeInTheDocument();
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'Tab' });
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });
  });

  describe('Async and rich items', () => {
    it('marks loading items aria-disabled and aria-busy', () => {
      render(
        <Dropdown
          trigger={<span>Menu</span>}
          items={[{ label: 'Adding…', loading: true }]}
        />
      );
      fireEvent.click(screen.getByText('Menu'));
      const item = screen.getByRole('menuitem', { name: 'Adding…' });
      expect(item).toHaveAttribute('aria-disabled', 'true');
      expect(item).toHaveAttribute('aria-busy', 'true');
    });

    it('does not fire onClick on a loading item', () => {
      const onClick = jest.fn();
      render(
        <Dropdown
          trigger={<span>Menu</span>}
          items={[{ label: 'Adding…', loading: true, onClick }]}
        />
      );
      fireEvent.click(screen.getByText('Menu'));
      fireEvent.click(screen.getByRole('menuitem', { name: 'Adding…' }));
      expect(onClick).not.toHaveBeenCalled();
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('skips loading items during keyboard navigation', () => {
      render(
        <Dropdown
          trigger={<span>Menu</span>}
          items={[
            { label: 'First', onClick: jest.fn() },
            { label: 'Adding…', loading: true },
            { label: 'Last', onClick: jest.fn() },
          ]}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems[0]).toHaveFocus();
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
      expect(menuItems[2]).toHaveFocus();
    });

    it('keeps the menu open when closeOnClick is false', () => {
      const onClick = jest.fn();
      render(
        <Dropdown
          trigger={<span>Menu</span>}
          items={[{ label: 'Add to target', onClick, closeOnClick: false }]}
        />
      );
      fireEvent.click(screen.getByText('Menu'));
      fireEvent.click(screen.getByRole('menuitem', { name: 'Add to target' }));
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('keeps the menu open on Enter when closeOnClick is false', () => {
      const onClick = jest.fn();
      render(
        <Dropdown
          trigger={<span>Menu</span>}
          items={[{ label: 'Add to target', onClick, closeOnClick: false }]}
        />
      );
      fireEvent.click(screen.getByText('Menu'));
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'Enter' });
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('renders custom content with label as the accessible name', () => {
      render(
        <Dropdown
          trigger={<span>Menu</span>}
          items={[
            {
              label: 'Target A',
              content: (
                <div>
                  <div>Target A</div>
                  <div>3 jobs tracked</div>
                </div>
              ),
            },
          ]}
        />
      );
      fireEvent.click(screen.getByText('Menu'));
      const item = screen.getByRole('menuitem', { name: 'Target A' });
      expect(item).toHaveAttribute('aria-label', 'Target A');
      expect(screen.getByText('3 jobs tracked')).toBeInTheDocument();
    });

    it('open menu with loading and custom-content items has no a11y violations', async () => {
      const { container } = render(
        <Dropdown
          trigger={<span>Menu</span>}
          items={[
            { label: 'Adding…', loading: true },
            { label: 'Target A', content: <div>Target A</div> },
          ]}
        />
      );
      fireEvent.click(screen.getByText('Menu'));
      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('composable trigger', () => {
    const buttonTrigger = (props: DropdownTriggerProps) => (
      <Button {...props} variant='secondary'>
        Menu
      </Button>
    );

    it('renders the composed element as the only trigger, with full wiring', () => {
      const { container } = render(
        <Dropdown trigger={buttonTrigger} items={items} />
      );
      const trigger = screen.getByRole('button', { name: 'Menu' });
      expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
      expect(trigger).toHaveAttribute('type', 'button');
      // No built-in button wraps the composed one — that would nest buttons
      expect(container.querySelectorAll('button')).toHaveLength(1);
    });

    it('opens the menu from a click on the composed trigger', () => {
      render(<Dropdown trigger={buttonTrigger} items={items} />);
      const trigger = screen.getByRole('button', { name: 'Menu' });
      fireEvent.click(trigger);
      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });

    it('opens the menu and focuses the first item from ArrowDown on the composed trigger', () => {
      render(<Dropdown trigger={buttonTrigger} items={items} />);
      fireEvent.keyDown(screen.getByRole('button', { name: 'Menu' }), {
        key: 'ArrowDown',
      });
      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(screen.getAllByRole('menuitem')[0]).toHaveFocus();
    });

    it('labels the menu by the composed trigger', () => {
      render(<Dropdown trigger={buttonTrigger} items={items} />);
      const trigger = screen.getByRole('button', { name: 'Menu' });
      fireEvent.click(trigger);
      expect(screen.getByRole('menu')).toHaveAttribute(
        'aria-labelledby',
        trigger.id
      );
    });

    it('closes on Escape and returns focus to the composed trigger', () => {
      render(<Dropdown trigger={buttonTrigger} items={items} />);
      const trigger = screen.getByRole('button', { name: 'Menu' });
      fireEvent.click(trigger);
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });

    it('open menu with a composed Button trigger has no a11y violations', async () => {
      const { container } = render(
        <Dropdown trigger={buttonTrigger} items={items} />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('controlled mode', () => {
    it('renders open when open prop is true', () => {
      render(
        <Dropdown
          trigger={<span>Menu</span>}
          items={items}
          open
          onOpenChange={() => {}}
        />
      );
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('stays open until the parent flips the prop', () => {
      const onOpenChange = jest.fn();
      render(
        <Dropdown
          trigger={<span>Menu</span>}
          items={items}
          open
          onOpenChange={onOpenChange}
        />
      );
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('requests opening via onOpenChange on trigger click', () => {
      const onOpenChange = jest.fn();
      render(
        <Dropdown
          trigger={<span>Menu</span>}
          items={items}
          open={false}
          onOpenChange={onOpenChange}
        />
      );
      fireEvent.click(screen.getByText('Menu'));
      expect(onOpenChange).toHaveBeenCalledWith(true);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('notifies onOpenChange on outside click', () => {
      const onOpenChange = jest.fn();
      render(
        <div>
          <Dropdown
            trigger={<span>Menu</span>}
            items={items}
            open
            onOpenChange={onOpenChange}
          />
          <span>Outside</span>
        </div>
      );
      fireEvent.mouseDown(screen.getByText('Outside'));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('notifies onOpenChange when an item activation closes the menu', () => {
      const onOpenChange = jest.fn();
      render(
        <Dropdown
          trigger={<span>Menu</span>}
          items={[{ label: 'Action', onClick: jest.fn() }]}
          open
          onOpenChange={onOpenChange}
        />
      );
      fireEvent.click(screen.getByRole('menuitem', { name: 'Action' }));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('fires onOpenChange in uncontrolled mode too', () => {
    const onOpenChange = jest.fn();
    render(
      <Dropdown
        trigger={<span>Menu</span>}
        items={items}
        onOpenChange={onOpenChange}
      />
    );
    fireEvent.click(screen.getByText('Menu'));
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    fireEvent.click(screen.getByText('Menu'));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('merges panelClassName onto the menu', () => {
    render(
      <Dropdown
        trigger={<span>Menu</span>}
        items={items}
        panelClassName='w-64'
      />
    );
    fireEvent.click(screen.getByText('Menu'));
    expect(screen.getByRole('menu')).toHaveClass('w-64');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <Dropdown trigger={<span>Menu</span>} items={items} />
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
