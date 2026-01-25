import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card } from './Card';

const meta: Meta<typeof Card> = {
  title: 'Components/Card',
  component: Card,
  tags: ['autodocs'],
  argTypes: {
    elevated: {
      description: 'Adds elevated shadow effect',
      control: 'boolean',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
    padding: {
      description: 'Padding size inside the card',
      control: 'select',
      options: [undefined, 'none', 'sm', 'md', 'lg'],
      table: {
        defaultValue: { summary: 'md' },
      },
    },
    children: {
      description: 'Card content',
      control: 'text',
    },
  },
};
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
