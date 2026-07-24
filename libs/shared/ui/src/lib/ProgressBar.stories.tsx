import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProgressBar } from './ProgressBar';

const meta = {
  title: 'Feedback/ProgressBar',
  component: ProgressBar,
  tags: ['autodocs'],
  argTypes: {
    value: {
      description: 'Current progress value',
      control: 'number',
    },
    max: {
      description: 'Maximum progress value',
      control: 'number',
      table: {
        defaultValue: { summary: '100' },
      },
    },
    variant: {
      description: 'Color variant of the progress bar',
      control: 'select',
      options: [undefined, 'accent', 'success', 'warning', 'error'],
      table: {
        defaultValue: { summary: 'accent' },
      },
    },
    size: {
      description: 'Height of the progress bar',
      control: 'select',
      options: [undefined, 'sm', 'md', 'lg'],
      table: {
        defaultValue: { summary: 'md' },
      },
    },
    showLabel: {
      description: 'Display percentage label',
      control: 'boolean',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
  },
} satisfies Meta<typeof ProgressBar>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: 50,
    max: 100,
    variant: 'accent',
    size: 'md',
    showLabel: false,
    'aria-label': 'Progress',
  },
};

export const WithLabel: Story = {
  args: {
    value: 75,
    max: 100,
    variant: 'accent',
    size: 'md',
    showLabel: true,
    'aria-label': 'Progress',
  },
};

export const Complete: Story = {
  args: {
    value: 100,
    max: 100,
    variant: 'success',
    size: 'md',
    showLabel: true,
    'aria-label': 'Progress complete',
  },
};

export const Success: Story = {
  args: {
    value: 70,
    variant: 'success',
    'aria-label': 'Success progress',
  },
};

export const Warning: Story = {
  args: {
    value: 80,
    variant: 'warning',
    showLabel: true,
    'aria-label': 'Usage approaching limit',
  },
};

export const Error: Story = {
  args: {
    value: 20,
    variant: 'error',
    'aria-label': 'Error progress',
  },
};

export const Small: Story = {
  args: {
    value: 50,
    size: 'sm',
    'aria-label': 'Small progress',
  },
};

export const Large: Story = {
  args: {
    value: 50,
    size: 'lg',
    'aria-label': 'Large progress',
  },
};
