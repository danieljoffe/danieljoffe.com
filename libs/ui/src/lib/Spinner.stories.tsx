import type { Meta, StoryObj } from '@storybook/react-vite';
import { Spinner } from './Spinner';

const meta: Meta<typeof Spinner> = {
  title: 'Components/Spinner',
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
      description: 'Color variant of the spinner',
      control: 'select',
      options: [undefined, 'accent', 'success', 'warning', 'error', 'info'],
      table: {
        defaultValue: { summary: 'accent' },
      },
    },
  },
};
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
