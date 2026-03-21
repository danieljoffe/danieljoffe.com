import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatsCard } from './StatsCard';

const meta = {
  title: 'Data Display/StatsCard',
  component: StatsCard,
  tags: ['autodocs'],
} satisfies Meta<typeof StatsCard>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Total Revenue',
    value: '$12,345',
  },
};

export const WithPositiveChange: Story = {
  args: {
    title: 'Active Users',
    value: '1,234',
    change: 12.5,
    changeLabel: 'vs last month',
  },
};

export const WithNegativeChange: Story = {
  args: {
    title: 'Bounce Rate',
    value: '34%',
    change: -5.2,
    changeLabel: 'vs last week',
  },
};

export const WithIcon: Story = {
  args: {
    title: 'Page Views',
    value: '89,234',
    change: 8,
    icon: <span className='text-lg'>📊</span>,
  },
};
