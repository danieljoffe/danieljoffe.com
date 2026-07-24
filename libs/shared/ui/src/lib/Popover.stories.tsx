import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { Button } from './Button';
import { Input } from './Input';
import { Popover } from './Popover';

const meta = {
  title: 'Overlay/Popover',
  component: Popover,
  tags: ['autodocs'],
  argTypes: {
    align: {
      control: 'select',
      options: ['left', 'right'],
      table: { defaultValue: { summary: 'left' } },
    },
    open: {
      description:
        'Controlled open state — omit to let the Popover manage its own',
      control: 'boolean',
    },
    panelClassName: {
      description: 'Merged onto the panel to override width, padding, etc.',
      control: 'text',
    },
  },
} satisfies Meta<typeof Popover>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    trigger: (
      <span className='px-3 py-1.5 border rounded-md text-sm'>
        Location filters
      </span>
    ),
    children: (
      <div className='flex flex-col gap-3'>
        <Input label='City' size='sm' placeholder='e.g. Berlin' />
        <Input label='Radius (km)' size='sm' placeholder='25' />
      </div>
    ),
  },
};

/**
 * Pass a render function as `children` to receive `close` — dismiss the panel
 * from an "Apply" button or after an async action completes. Closing this way
 * returns focus to the trigger.
 */
export const WithApplyButton: Story = {
  args: {
    trigger: (
      <span className='px-3 py-1.5 border rounded-md text-sm'>Filters</span>
    ),
    children: null,
  },
  render: args => (
    <Popover {...args}>
      {({ close }) => (
        <div className='flex flex-col gap-3'>
          <Input label='City' size='sm' placeholder='e.g. Berlin' />
          <Button size='sm' onClick={close}>
            Apply
          </Button>
        </div>
      )}
    </Popover>
  ),
};

export const RightAligned: Story = {
  args: {
    trigger: (
      <span className='px-3 py-1.5 border rounded-md text-sm'>Options</span>
    ),
    align: 'right',
    children: <p className='text-sm'>Aligned to the trigger's right edge.</p>,
  },
};

// Visual-regression only: open the panel and leave it open so the popup is
// captured (the other stories snapshot just the trigger).
export const OpenState: Story = {
  args: {
    trigger: (
      <span className='px-3 py-1.5 border rounded-md text-sm'>
        Location filters
      </span>
    ),
    children: (
      <div className='flex flex-col gap-3'>
        <Input label='City' size='sm' placeholder='e.g. Berlin' />
        <Input label='Radius (km)' size='sm' placeholder='25' />
      </div>
    ),
  },
  parameters: { visual: { interact: true } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole('button', { name: 'Location filters' })
    );
    await waitFor(() => expect(canvas.getByRole('dialog')).toBeInTheDocument());
  },
};

/**
 * Controlled mode: drive `open` yourself and react to `onOpenChange`. The
 * Popover still owns dismissal interactions (outside click, Escape, trigger
 * toggle) and reports them through `onOpenChange`.
 */
export const Controlled: Story = {
  args: {
    trigger: (
      <span className='px-3 py-1.5 border rounded-md text-sm'>Controlled</span>
    ),
    open: false,
    onOpenChange: fn(),
    children: <p className='text-sm'>Open state lives in the parent.</p>,
  },
  render: function ControlledPopover(args) {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <Popover
        {...args}
        open={isOpen}
        onOpenChange={next => {
          setIsOpen(next);
          args.onOpenChange?.(next);
        }}
      />
    );
  },
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: 'Controlled' });

    await step('Open via trigger', async () => {
      await userEvent.click(trigger);
      await waitFor(() =>
        expect(canvas.getByRole('dialog')).toBeInTheDocument()
      );
      await expect(args.onOpenChange).toHaveBeenCalledWith(true);
    });

    await step('Close via Escape', async () => {
      await userEvent.keyboard('{Escape}');
      await waitFor(() =>
        expect(canvas.queryByRole('dialog')).not.toBeInTheDocument()
      );
      await expect(args.onOpenChange).toHaveBeenCalledWith(false);
    });
  },
};

export const EscapeRestoresFocus: Story = {
  args: {
    trigger: (
      <span className='px-3 py-1.5 border rounded-md text-sm'>Filters</span>
    ),
    children: (
      <div className='flex flex-col gap-3'>
        <Input label='City' size='sm' placeholder='e.g. Berlin' />
      </div>
    ),
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: 'Filters' });

    await step('Open and autofocus the first field', async () => {
      await userEvent.click(trigger);
      await waitFor(() =>
        expect(canvas.getByRole('textbox', { name: /City/ })).toHaveFocus()
      );
    });

    await step('Escape closes and restores trigger focus', async () => {
      await userEvent.keyboard('{Escape}');
      await waitFor(() =>
        expect(canvas.queryByRole('dialog')).not.toBeInTheDocument()
      );
      await expect(trigger).toHaveFocus();
    });
  },
};
