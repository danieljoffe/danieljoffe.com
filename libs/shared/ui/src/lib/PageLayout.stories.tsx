import type { Meta, StoryObj } from '@storybook/react-vite';
import { PageLayout } from './PageLayout';

const meta = {
  title: 'Layout/PageLayout',
  component: PageLayout,
  tags: ['autodocs'],
} satisfies Meta<typeof PageLayout>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <div className='p-8 bg-surface-secondary border border-border rounded-lg text-text-primary text-center'>
        Page content goes here
      </div>
    ),
  },
};

export const Wide: Story = {
  args: {
    wide: true,
    children: (
      <div className='p-8 bg-surface-secondary border border-border rounded-lg text-text-primary text-center'>
        Wide page content
      </div>
    ),
  },
};
