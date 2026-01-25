import type { Meta, StoryObj } from '@storybook/react-vite';
import { Spinner } from './Spinner';

const meta = {
  component: Spinner,
  title: 'Spinner',
} satisfies Meta<typeof Spinner>;
export default meta;

type Story = StoryObj<typeof Spinner>;

export const Default: Story = {
  args: {
    size: 'md',
    variant: 'accent',
    'aria-label': 'Loading',
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    variant: 'accent',
    'aria-label': 'Loading',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    variant: 'accent',
    'aria-label': 'Loading',
  },
};
