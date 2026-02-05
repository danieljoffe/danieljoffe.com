import type { Meta, StoryObj } from '@storybook/react-vite';
import { Divider } from './Divider';

const meta: Meta<typeof Divider> = {
  title: 'Layout/Divider',
  component: Divider,
  tags: ['autodocs'],
  argTypes: {
    orientation: {
      description: 'Direction of the divider line',
      control: 'select',
      options: [undefined, 'horizontal', 'vertical'],
      table: {
        defaultValue: { summary: 'horizontal' },
      },
    },
    label: {
      description: 'Optional text label displayed in the center',
      control: 'text',
    },
  },
};
export default meta;

type Story = StoryObj<typeof Divider>;

export const Default: Story = {
  args: {},
};

export const WithLabel: Story = {
  args: {
    label: 'OR',
  },
};

export const Vertical: Story = {
  args: {
    orientation: 'vertical',
    className: 'h-20',
  },
};
