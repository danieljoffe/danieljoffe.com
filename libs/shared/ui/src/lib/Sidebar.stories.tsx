import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Sidebar } from './Sidebar';

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

export const Default: Story = {
  args: {
    items: sampleItems,
    activeId: 'dashboard',
  },
};

export const WithHeaderFooter: Story = {
  args: {
    items: sampleItems,
    activeId: 'dashboard',
    header: <span className='font-semibold text-sm'>My App</span>,
    footer: <span className='text-xs text-gray-500'>v1.0.0</span>,
  },
};

export const Collapsed: Story = {
  args: {
    items: sampleItems,
    collapsed: true,
  },
};

export const Interactive: Story = {
  render: () => {
    const [activeId, setActiveId] = useState('dashboard');
    return (
      <Sidebar items={sampleItems} activeId={activeId} onSelect={setActiveId} />
    );
  },
};
