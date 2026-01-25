import type { Meta, StoryObj } from '@storybook/react-vite';
import { Divider } from './Divider';

const meta = {
  component: Divider,
  title: 'Divider',
  argTypes: {
    orientation: {
      control: 'select',
      options: [undefined, 'horizontal', 'vertical'],
    },
  },
} satisfies Meta<typeof Divider>;
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
