import type { Meta, StoryObj } from '@storybook/react-vite';
import { Skeleton } from './Skeleton';

const meta = {
  title: 'Feedback/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['text', 'circular', 'rectangular'],
      table: { defaultValue: { summary: 'text' } },
    },
  },
} satisfies Meta<typeof Skeleton>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Text: Story = {
  args: { variant: 'text', lines: 3 },
};

export const SingleLine: Story = {
  args: { variant: 'text', lines: 1 },
};

export const Circular: Story = {
  args: { variant: 'circular', width: 48, height: 48 },
};

export const Rectangular: Story = {
  args: { variant: 'rectangular', width: 300, height: 200 },
};

export const CardPlaceholder: Story = {
  render: () => (
    <div className='flex gap-4 p-4 border rounded-lg max-w-sm'>
      <Skeleton variant='circular' width={40} height={40} />
      <div className='flex-1'>
        <Skeleton lines={1} />
        <div className='mt-2'>
          <Skeleton lines={2} />
        </div>
      </div>
    </div>
  ),
};
