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
    variant: {
      description: 'Visual variant of the spinner',
      control: 'select',
      options: [undefined, 'accent', 'success', 'warning', 'error', 'info'],
      table: {
        defaultValue: { summary: 'accent' },
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

export const Accent: Story = {
  args: {
    variant: 'accent',
    'aria-label': 'Loading',
  },
};

export const Success: Story = {
  args: {
    variant: 'success',
    'aria-label': 'Loading',
  },
};

export const Warning: Story = {
  args: {
    variant: 'warning',
    'aria-label': 'Loading',
  },
};

export const Error: Story = {
  args: {
    variant: 'error',
    'aria-label': 'Loading',
  },
};

export const Info: Story = {
  args: {
    variant: 'info',
    'aria-label': 'Loading',
  },
};
