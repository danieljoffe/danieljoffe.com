import type { Meta, StoryObj } from '@storybook/react-vite';
import { Spinner } from './Spinner';

const meta = {
  title: 'Feedback/Spinner',
  component: Spinner,
  tags: ['autodocs'],
  argTypes: {
    size: {
      description: 'Size of the spinner',
      control: 'select',
      options: [undefined, 'sm', 'md', 'lg'],
      table: {
        defaultValue: { summary: 'md' },
      },
    },
  },
} satisfies Meta<typeof Spinner>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    size: 'md',
    'aria-label': 'Loading',
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    'aria-label': 'Loading',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    'aria-label': 'Loading',
  },
};
