import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProgressBar } from './ProgressBar';

const meta = {
  component: ProgressBar,
  title: 'ProgressBar',
} satisfies Meta<typeof ProgressBar>;
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
