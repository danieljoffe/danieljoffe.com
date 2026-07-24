import { render, screen, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Popover } from './Popover';

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

describe('Popover', () => {
  it('renders the trigger', () => {
    render(
      <Popover trigger={<span>Filters</span>}>
        <p>Panel content</p>
      </Popover>
    );
    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('does not show the panel initially', () => {
    render(
      <Popover trigger={<span>Filters</span>}>
        <p>Panel content</p>
      </Popover>
    );
    expect(screen.queryByText('Panel content')).not.toBeInTheDocument();
  });

  it('opens the panel when the trigger is clicked', () => {
    render(
      <Popover trigger={<span>Filters</span>}>
        <p>Panel content</p>
      </Popover>
    );
    fireEvent.click(screen.getByText('Filters'));
    expect(screen.getByText('Panel content')).toBeInTheDocument();
  });

  it('closes the panel when the trigger is clicked again', () => {
    render(
      <Popover trigger={<span>Filters</span>}>
        <p>Panel content</p>
      </Popover>
    );
    fireEvent.click(screen.getByText('Filters'));
    fireEvent.click(screen.getByText('Filters'));
    expect(screen.queryByText('Panel content')).not.toBeInTheDocument();
  });

  it('closes when clicking outside without moving focus', () => {
    render(
      <div>
        <Popover trigger={<span>Filters</span>}>
          <p>Panel content</p>
        </Popover>
        <span>Outside</span>
      </div>
    );
    fireEvent.click(screen.getByText('Filters'));
    expect(screen.getByText('Panel content')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByText('Outside'));
    expect(screen.queryByText('Panel content')).not.toBeInTheDocument();
  });

  it('closes on Escape and returns focus to the trigger', () => {
    render(
      <Popover trigger={<span>Filters</span>}>
        <input aria-label='City' />
      </Popover>
    );
    const trigger = screen.getByRole('button', { name: 'Filters' });
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('moves focus to the first focusable element on open', () => {
    render(
      <Popover trigger={<span>Filters</span>}>
        <input aria-label='City' />
      </Popover>
    );
    fireEvent.click(screen.getByText('Filters'));
    expect(screen.getByRole('textbox', { name: 'City' })).toHaveFocus();
  });

  it('focuses the panel itself when it has no focusable children', () => {
    render(
      <Popover trigger={<span>Filters</span>}>
        <p>Read-only content</p>
      </Popover>
    );
    fireEvent.click(screen.getByText('Filters'));
    expect(screen.getByRole('dialog')).toHaveFocus();
  });

  it('render-prop close dismisses the panel and restores trigger focus', () => {
    render(
      <Popover trigger={<span>Filters</span>}>
        {({ close }) => (
          <button type='button' onClick={close}>
            Apply
          </button>
        )}
      </Popover>
    );
    const trigger = screen.getByRole('button', { name: 'Filters' });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('applies right alignment when specified', () => {
    render(
      <Popover trigger={<span>Filters</span>} align='right'>
        <p>Panel content</p>
      </Popover>
    );
    fireEvent.click(screen.getByText('Filters'));
    expect(screen.getByRole('dialog')).toHaveClass('right-0');
  });

  it('merges panelClassName onto the panel', () => {
    render(
      <Popover trigger={<span>Filters</span>} panelClassName='w-80'>
        <p>Panel content</p>
      </Popover>
    );
    fireEvent.click(screen.getByText('Filters'));
    expect(screen.getByRole('dialog')).toHaveClass('w-80');
  });

  describe('ARIA attributes', () => {
    it('has aria-haspopup="dialog" on the trigger', () => {
      render(
        <Popover trigger={<span>Filters</span>}>
          <p>Panel content</p>
        </Popover>
      );
      expect(screen.getByRole('button', { name: 'Filters' })).toHaveAttribute(
        'aria-haspopup',
        'dialog'
      );
    });

    it('toggles aria-expanded with open state', () => {
      render(
        <Popover trigger={<span>Filters</span>}>
          <p>Panel content</p>
        </Popover>
      );
      const trigger = screen.getByRole('button', { name: 'Filters' });
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });

    it('links trigger to panel via aria-controls when open', () => {
      render(
        <Popover trigger={<span>Filters</span>}>
          <p>Panel content</p>
        </Popover>
      );
      const trigger = screen.getByRole('button', { name: 'Filters' });
      expect(trigger).not.toHaveAttribute('aria-controls');
      fireEvent.click(trigger);
      const panelId = trigger.getAttribute('aria-controls');
      expect(panelId).toBeTruthy();
      expect(screen.getByRole('dialog')).toHaveAttribute('id', panelId);
    });

    it('labels the panel by the trigger by default', () => {
      render(
        <Popover trigger={<span>Filters</span>}>
          <p>Panel content</p>
        </Popover>
      );
      const trigger = screen.getByRole('button', { name: 'Filters' });
      fireEvent.click(trigger);
      expect(screen.getByRole('dialog')).toHaveAttribute(
        'aria-labelledby',
        trigger.id
      );
    });

    it('uses aria-label for the panel when provided', () => {
      render(
        <Popover trigger={<span>Filters</span>} aria-label='Location filters'>
          <p>Panel content</p>
        </Popover>
      );
      fireEvent.click(screen.getByText('Filters'));
      const dialog = screen.getByRole('dialog', { name: 'Location filters' });
      expect(dialog).not.toHaveAttribute('aria-labelledby');
    });
  });

  describe('controlled mode', () => {
    it('renders open when open prop is true', () => {
      render(
        <Popover trigger={<span>Filters</span>} open onOpenChange={() => {}}>
          <p>Panel content</p>
        </Popover>
      );
      expect(screen.getByText('Panel content')).toBeInTheDocument();
    });

    it('stays open until the parent flips the prop', () => {
      const onOpenChange = jest.fn();
      render(
        <Popover
          trigger={<span>Filters</span>}
          open
          onOpenChange={onOpenChange}
        >
          <p>Panel content</p>
        </Popover>
      );
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(screen.getByText('Panel content')).toBeInTheDocument();
    });

    it('requests opening via onOpenChange on trigger click', () => {
      const onOpenChange = jest.fn();
      render(
        <Popover
          trigger={<span>Filters</span>}
          open={false}
          onOpenChange={onOpenChange}
        >
          <p>Panel content</p>
        </Popover>
      );
      fireEvent.click(screen.getByText('Filters'));
      expect(onOpenChange).toHaveBeenCalledWith(true);
      expect(screen.queryByText('Panel content')).not.toBeInTheDocument();
    });

    it('notifies onOpenChange on outside click', () => {
      const onOpenChange = jest.fn();
      render(
        <div>
          <Popover
            trigger={<span>Filters</span>}
            open
            onOpenChange={onOpenChange}
          >
            <p>Panel content</p>
          </Popover>
          <span>Outside</span>
        </div>
      );
      fireEvent.mouseDown(screen.getByText('Outside'));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('fires onOpenChange in uncontrolled mode too', () => {
    const onOpenChange = jest.fn();
    render(
      <Popover trigger={<span>Filters</span>} onOpenChange={onOpenChange}>
        <p>Panel content</p>
      </Popover>
    );
    fireEvent.click(screen.getByText('Filters'));
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    fireEvent.click(screen.getByText('Filters'));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('has no accessibility violations when closed', async () => {
    const { container } = render(
      <Popover trigger={<span>Filters</span>}>
        <p>Panel content</p>
      </Popover>
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no accessibility violations when open', async () => {
    const { container } = render(
      <Popover trigger={<span>Filters</span>}>
        <input aria-label='City' />
      </Popover>
    );
    fireEvent.click(screen.getByText('Filters'));
    expect(await axe(container)).toHaveNoViolations();
  });
});
