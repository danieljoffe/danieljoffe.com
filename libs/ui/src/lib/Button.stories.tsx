import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      description: 'Visual style of the button',
      control: 'select',
      options: [
        undefined,
        'primary',
        'secondary',
        'ghost',
        'outline',
        'accent',
        'success',
        'error',
        'warning',
        'info',
      ],
      table: {
        defaultValue: { summary: 'primary' },
      },
    },
    size: {
      description: 'Size of the button',
      control: 'select',
      options: [undefined, 'sm', 'md', 'lg'],
      table: {
        defaultValue: { summary: 'md' },
      },
    },
    disabled: {
      description: 'Disables interaction',
      control: 'boolean',
    },
    children: {
      description: 'Button content',
      control: 'text',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    children: 'Button',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    size: 'md',
    children: 'Secondary',
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    size: 'md',
    children: 'Ghost',
  },
};

export const Small: Story = {
  args: {
    variant: 'primary',
    size: 'sm',
    children: 'Small',
  },
};

export const Large: Story = {
  args: {
    variant: 'primary',
    size: 'lg',
    children: 'Large',
  },
};
