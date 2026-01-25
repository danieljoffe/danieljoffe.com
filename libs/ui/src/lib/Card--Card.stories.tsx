import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card } from './Card';

const meta = {
  component: Card,
  title: 'Card',
  argTypes: {
    elevated: { control: 'boolean' },
    padding: {
      control: 'select',
      options: [undefined, 'none', 'sm', 'md', 'lg'],
    },
  },
} satisfies Meta<typeof Card>;
export default meta;

type Story = StoryObj<typeof Card>;

export const Default: Story = {
  args: {
    children: 'Card content goes here',
  },
};

export const Elevated: Story = {
  args: {
    children: 'Elevated card content',
    elevated: true,
  },
};

export const NoPadding: Story = {
  args: {
    children: 'Card without padding',
    padding: 'none',
  },
};

export const LargePadding: Story = {
  args: {
    children: 'Card with large padding',
    padding: 'lg',
  },
};
