import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useArgs } from 'storybook/preview-api';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { Sidebar, type SidebarProps } from './Sidebar';

const meta = {
  title: 'Navigation/Sidebar',
  component: Sidebar,
  tags: ['autodocs'],
  decorators: [
    Story => (
      <div style={{ height: 400 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Sidebar>;
export default meta;

type Story = StoryObj<typeof meta>;

const sampleItems = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'analytics', label: 'Analytics', badge: 5 },
  {
    id: 'projects',
    label: 'Projects',
    children: [
      { id: 'active', label: 'Active' },
      { id: 'archived', label: 'Archived' },
    ],
  },
  { id: 'settings', label: 'Settings' },
];

const iconItems = [
  {
    id: 'home',
    label: 'Home',
    icon: (
      <svg
        viewBox='0 0 16 16'
        fill='currentColor'
        className='h-4 w-4'
        aria-hidden='true'
      >
        <path d='M8 1l7 6v8H1V7z' />
      </svg>
    ),
  },
  {
    id: 'search',
    label: 'Search',
    icon: (
      <svg
        viewBox='0 0 16 16'
        fill='currentColor'
        className='h-4 w-4'
        aria-hidden='true'
      >
        <circle cx='6' cy='6' r='5' fill='none' stroke='currentColor' />
        <line
          x1='10'
          y1='10'
          x2='15'
          y2='15'
          stroke='currentColor'
          strokeWidth='2'
        />
      </svg>
    ),
  },
];

// Sidebar is controlled via `activeId` + `onSelect`. Wire it through `useArgs`
// so selecting an item actually moves the active highlight in the showcase,
// instead of `onSelect` being a no-op against a frozen `activeId`.
function InteractiveSidebar(args: SidebarProps) {
  const [, updateArgs] = useArgs<SidebarProps>();
  return (
    <Sidebar
      {...args}
      onSelect={id => {
        updateArgs({ activeId: id });
        args.onSelect?.(id);
      }}
    />
  );
}

export const Default: Story = {
  args: {
    items: sampleItems,
    activeId: 'dashboard',
  },
  render: InteractiveSidebar,
};

export const WithHeaderFooter: Story = {
  args: {
    items: sampleItems,
    activeId: 'dashboard',
    header: <span className='font-semibold text-sm'>My App</span>,
    footer: <span className='text-xs text-text-secondary'>v1.0.0</span>,
  },
  render: InteractiveSidebar,
};

export const Collapsed: Story = {
  args: {
    items: sampleItems,
    collapsed: true,
  },
};

export const WithIcons: Story = {
  args: {
    items: iconItems,
    activeId: 'home',
  },
  render: InteractiveSidebar,
};

export const Interactive: Story = {
  args: { items: sampleItems, activeId: 'dashboard' },
  render: () => {
    const [activeId, setActiveId] = useState('dashboard');
    return (
      <Sidebar items={sampleItems} activeId={activeId} onSelect={setActiveId} />
    );
  },
};

export const SelectItem: Story = {
  args: {
    items: sampleItems,
    activeId: 'dashboard',
    onSelect: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    // Click a sidebar item
    await userEvent.click(canvas.getByRole('button', { name: 'Analytics' }));
    await expect(args.onSelect).toHaveBeenCalledWith('analytics');
  },
};

export const ExpandChildren: Story = {
  args: {
    items: sampleItems,
    activeId: 'dashboard',
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('Expand Projects group', async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Projects' }));
      await waitFor(() => {
        expect(canvas.getByText('Active')).toBeInTheDocument();
        expect(canvas.getByText('Archived')).toBeInTheDocument();
      });
    });

    await step('Collapse Projects group', async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Projects' }));
      await waitFor(() =>
        expect(canvas.queryByText('Active')).not.toBeInTheDocument()
      );
    });
  },
};

export const ChildNavigation: Story = {
  args: {
    items: sampleItems,
    activeId: 'active',
  },
  render: function ChildNav() {
    const [activeId, setActiveId] = useState('active');
    return (
      <Sidebar items={sampleItems} activeId={activeId} onSelect={setActiveId} />
    );
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('Expand Projects', async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Projects' }));
      await waitFor(() =>
        expect(canvas.getByText('Archived')).toBeInTheDocument()
      );
    });

    await step('Select child item', async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Archived' }));
    });
  },
};
