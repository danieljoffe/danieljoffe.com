import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Switch } from './Switch';

const meta: Meta<typeof Switch> = {
  title: 'Components/Switch',
  component: Switch,
  tags: ['autodocs'],
  argTypes: {
    checked: {
      description: 'Whether the switch is on',
      control: 'boolean',
    },
    label: {
      description: 'Label text displayed next to the switch',
      control: 'text',
    },
    disabled: {
      description: 'Disables the switch',
      control: 'boolean',
    },
    onCheckedChange: {
      description: 'Callback when switch state changes',
      action: 'onCheckedChange executed!',
    },
  },
};

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

export const ClickInteraction: Story = {
  args: {
    checked: false,
    label: 'Toggle me',
    onCheckedChange: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const switchEl = canvas.getByRole('switch');

    await expect(switchEl).toHaveAttribute('aria-checked', 'false');

    await userEvent.click(switchEl);
    await expect(args.onCheckedChange).toHaveBeenCalledWith(true);
  },
};

export const KeyboardInteraction: Story = {
  args: {
    checked: false,
    label: 'Press space to toggle',
    onCheckedChange: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const switchEl = canvas.getByRole('switch');

    await userEvent.tab();
    await expect(switchEl).toHaveFocus();

    await userEvent.keyboard(' ');
    await expect(args.onCheckedChange).toHaveBeenCalledWith(true);
  },
};

export const Controlled: Story = {
  render: function ControlledSwitch() {
    const [checked, setChecked] = useState(false);
    return (
      <Switch
        label={`Switch is ${checked ? 'on' : 'off'}`}
        checked={checked}
        onCheckedChange={setChecked}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const switchEl = canvas.getByRole('switch');

    await expect(switchEl).toHaveAttribute('aria-checked', 'false');
    await expect(canvas.getByText('Switch is off')).toBeInTheDocument();

    await userEvent.click(switchEl);
    await expect(switchEl).toHaveAttribute('aria-checked', 'true');
    await expect(canvas.getByText('Switch is on')).toBeInTheDocument();
  },
};
