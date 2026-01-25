import type { Meta, StoryObj } from '@storybook/react-vite';
import { Switch } from './Switch';

const meta = {
  component: Switch,
  title: 'Switch',
  argTypes: {
    onCheckedChange: { action: 'onCheckedChange executed!' },
  },
} satisfies Meta<typeof Switch>;
export default meta;

type Story = StoryObj<typeof Switch>;

export const Default: Story = {
  args: {
    checked: false,
    label: 'Enable notifications',
  },
};

export const Checked: Story = {
  args: {
    checked: true,
    label: 'Dark mode',
  },
};

export const Disabled: Story = {
  args: {
    checked: false,
    label: 'Disabled switch',
    disabled: true,
  },
};
