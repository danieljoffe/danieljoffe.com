import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useArgs } from 'storybook/preview-api';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { Switch, type SwitchProps } from './Switch';

const meta = {
  title: 'Forms/Switch',
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
    onChange: {
      description: 'Callback when switch state changes',
      action: 'onChange executed!',
    },
  },
  // Keep the `checked` arg in sync with clicks so every story is interactive
  // (Switch is controlled-only). Without this the thumb never moves.
  render: function Render(args) {
    const [, updateArgs] = useArgs<SwitchProps>();
    return (
      <Switch
        {...args}
        onChange={value => {
          updateArgs({ checked: value });
          args.onChange?.(value);
        }}
      />
    );
  },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    checked: false,
    label: 'Enable notifications',
    onChange: fn(),
  },
};

export const Checked: Story = {
  args: {
    checked: true,
    label: 'Dark mode',
    onChange: fn(),
  },
};

export const Disabled: Story = {
  args: {
    checked: false,
    label: 'Disabled switch',
    disabled: true,
    onChange: fn(),
  },
};

export const WithError: Story = {
  args: {
    error: 'This setting is required',
    label: 'Enable notifications',
    checked: false,
    onChange: fn(),
  },
};

export const ClickInteraction: Story = {
  args: {
    checked: false,
    label: 'Toggle me',
    onChange: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const switchEl = canvas.getByRole('switch');

    await expect(switchEl).toHaveAttribute('aria-checked', 'false');

    await userEvent.click(switchEl);
    await expect(args.onChange).toHaveBeenCalledWith(true);
  },
};

export const KeyboardInteraction: Story = {
  args: {
    checked: false,
    label: 'Press space to toggle',
    onChange: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const switchEl = canvas.getByRole('switch');

    await userEvent.tab();
    await expect(switchEl).toHaveFocus();

    await userEvent.keyboard(' ');
    await expect(args.onChange).toHaveBeenCalledWith(true);
  },
};

export const Controlled: Story = {
  args: {
    checked: false,
    onChange: fn(),
  },
  render: function ControlledSwitch() {
    const [checked, setChecked] = useState(false);
    return (
      <Switch
        label={`Switch is ${checked ? 'on' : 'off'}`}
        checked={checked}
        onChange={setChecked}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const switchEl = canvas.getByRole('switch');

    await expect(switchEl).toHaveAttribute('aria-checked', 'false');
    await expect(canvas.getByText('Switch is off')).toBeInTheDocument();

    await userEvent.click(switchEl);
    await waitFor(() => {
      expect(switchEl).toHaveAttribute('aria-checked', 'true');
      expect(canvas.getByText('Switch is on')).toBeInTheDocument();
    });
  },
};
