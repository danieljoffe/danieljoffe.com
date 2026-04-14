import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { Dropdown } from './Dropdown';

const meta = {
  title: 'Overlay/Dropdown',
  component: Dropdown,
  tags: ['autodocs'],
  argTypes: {
    align: {
      control: 'select',
      options: ['left', 'right'],
      table: { defaultValue: { summary: 'left' } },
    },
  },
} satisfies Meta<typeof Dropdown>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    trigger: (
      <span className='px-3 py-1.5 border rounded-md text-sm'>Actions</span>
    ),
    items: [
      { label: 'Edit' },
      { label: 'Duplicate' },
      { label: '', divider: true },
      { label: 'Delete', danger: true },
    ],
  },
};

export const RightAligned: Story = {
  args: {
    trigger: (
      <span className='px-3 py-1.5 border rounded-md text-sm'>Menu</span>
    ),
    align: 'right',
    items: [
      { label: 'Profile' },
      { label: 'Settings' },
      { label: 'Sign out', danger: true },
    ],
  },
};

export const WithDisabledItems: Story = {
  args: {
    trigger: (
      <span className='px-3 py-1.5 border rounded-md text-sm'>Options</span>
    ),
    items: [
      { label: 'Available action' },
      { label: 'Disabled action', disabled: true },
    ],
  },
};

export const WithDangerItem: Story = {
  args: {
    trigger: (
      <span className='px-3 py-1.5 border rounded-md text-sm'>Manage</span>
    ),
    items: [
      { label: 'Rename' },
      { label: 'Move' },
      { label: 'Delete', danger: true },
    ],
  },
};

export const WithDivider: Story = {
  args: {
    trigger: (
      <span className='px-3 py-1.5 border rounded-md text-sm'>File</span>
    ),
    items: [
      { label: 'New' },
      { label: 'Open' },
      { label: '', divider: true },
      { label: 'Save' },
      { label: 'Save as' },
      { label: '', divider: true },
      { label: 'Exit' },
    ],
  },
};

export const WithIcons: Story = {
  args: {
    trigger: (
      <span className='px-3 py-1.5 border rounded-md text-sm'>Actions</span>
    ),
    items: [
      {
        label: 'Edit',
        icon: (
          <svg viewBox='0 0 16 16' fill='currentColor' aria-hidden='true'>
            <path d='M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25a1.75 1.75 0 01.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L3.463 11.098a.25.25 0 00-.064.108l-.563 1.97 1.971-.564a.25.25 0 00.108-.064l8.61-8.61a.25.25 0 000-.354l-1.098-1.098z' />
          </svg>
        ),
      },
      {
        label: 'Copy',
        icon: (
          <svg viewBox='0 0 16 16' fill='currentColor' aria-hidden='true'>
            <path d='M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z' />
            <path d='M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z' />
          </svg>
        ),
      },
      { label: '', divider: true },
      {
        label: 'Delete',
        danger: true,
        icon: (
          <svg viewBox='0 0 16 16' fill='currentColor' aria-hidden='true'>
            <path d='M6.5 1.75a.25.25 0 01.25-.25h2.5a.25.25 0 01.25.25V3h-3V1.75zm4.5 0V3h2.25a.75.75 0 010 1.5H2.75a.75.75 0 010-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.496 6.675a.75.75 0 10-1.492.15l.66 6.6A1.75 1.75 0 005.405 15h5.19a1.75 1.75 0 001.741-1.575l.66-6.6a.75.75 0 00-1.492-.15l-.66 6.6a.25.25 0 01-.249.225h-5.19a.25.25 0 01-.249-.225l-.66-6.6z' />
          </svg>
        ),
      },
    ],
  },
};

export const OpenAndClose: Story = {
  args: {
    trigger: (
      <span className='px-3 py-1.5 border rounded-md text-sm'>Toggle</span>
    ),
    items: [{ label: 'Option A' }, { label: 'Option B' }],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: 'Toggle' });

    // Open the dropdown
    await userEvent.click(trigger);
    await waitFor(() => expect(canvas.getByRole('menu')).toBeInTheDocument());

    // Close by clicking trigger again
    await userEvent.click(trigger);
    await waitFor(() =>
      expect(canvas.queryByRole('menu')).not.toBeInTheDocument()
    );
  },
};

export const ItemClick: Story = {
  args: {
    trigger: (
      <span className='px-3 py-1.5 border rounded-md text-sm'>Click Item</span>
    ),
    items: [
      { label: 'Action One', onClick: fn() },
      { label: 'Action Two', onClick: fn() },
    ],
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    // Open the dropdown
    await userEvent.click(canvas.getByRole('button', { name: 'Click Item' }));
    await waitFor(() => expect(canvas.getByRole('menu')).toBeInTheDocument());

    // Click an item
    await userEvent.click(canvas.getByRole('menuitem', { name: 'Action One' }));

    // Menu should close after clicking an item
    await waitFor(() =>
      expect(canvas.queryByRole('menu')).not.toBeInTheDocument()
    );
    await expect(args.items[0].onClick).toHaveBeenCalled();
  },
};

export const KeyboardNavigation: Story = {
  args: {
    trigger: (
      <span className='px-3 py-1.5 border rounded-md text-sm'>Keyboard</span>
    ),
    items: [{ label: 'First' }, { label: 'Second' }, { label: 'Third' }],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: 'Keyboard' });

    // Open with click
    await userEvent.click(trigger);
    await waitFor(() => expect(canvas.getByRole('menu')).toBeInTheDocument());

    // Navigate down
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{ArrowDown}');

    // Navigate up
    await userEvent.keyboard('{ArrowUp}');

    // Home key
    await userEvent.keyboard('{Home}');

    // End key
    await userEvent.keyboard('{End}');

    // Close with Escape
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(canvas.queryByRole('menu')).not.toBeInTheDocument()
    );
  },
};

export const EnterToSelect: Story = {
  args: {
    trigger: (
      <span className='px-3 py-1.5 border rounded-md text-sm'>
        Select with Enter
      </span>
    ),
    items: [{ label: 'Select me', onClick: fn() }, { label: 'Or me' }],
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: 'Select with Enter' });

    // Open dropdown
    await userEvent.click(trigger);
    await waitFor(() => expect(canvas.getByRole('menu')).toBeInTheDocument());

    // First item is focused, press Enter to select
    await userEvent.keyboard('{Enter}');

    await waitFor(() =>
      expect(canvas.queryByRole('menu')).not.toBeInTheDocument()
    );
    await expect(args.items[0].onClick).toHaveBeenCalled();
  },
};

export const ArrowKeyOpen: Story = {
  args: {
    trigger: (
      <span className='px-3 py-1.5 border rounded-md text-sm'>Arrow</span>
    ),
    items: [{ label: 'Item A' }, { label: 'Item B' }],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: 'Arrow' });

    // Focus the trigger
    trigger.focus();

    // Open with ArrowDown key on trigger
    await userEvent.keyboard('{ArrowDown}');
    await waitFor(() => expect(canvas.getByRole('menu')).toBeInTheDocument());

    // Tab to close
    await userEvent.keyboard('{Tab}');
    await waitFor(() =>
      expect(canvas.queryByRole('menu')).not.toBeInTheDocument()
    );
  },
};
