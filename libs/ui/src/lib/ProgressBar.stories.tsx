import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProgressBar } from './ProgressBar';

const meta: Meta<typeof ProgressBar> = {
  title: 'Components/ProgressBar',
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
      options: [undefined, 'accent', 'success', 'warning', 'error', 'info'],
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
};
export default meta;

type Story = StoryObj<typeof ProgressBar>;

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
