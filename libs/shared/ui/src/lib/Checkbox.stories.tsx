import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Checkbox } from './Checkbox';

const meta = {
  title: 'Forms/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
  argTypes: {
    label: {
      description: 'Label text displayed next to the checkbox',
      control: 'text',
    },
    checked: {
      description: 'Whether the checkbox is checked',
      control: 'boolean',
    },
    disabled: {
      description: 'Disables the checkbox',
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Accept terms and conditions',
  },
};

export const Checked: Story = {
  args: {
    label: 'Remember me',
    checked: true,
    onChange: fn(),
  },
};

export const Disabled: Story = {
  args: {
    label: 'Disabled option',
    disabled: true,
  },
};

export const WithError: Story = {
  args: {
    error: 'You must accept the terms',
    label: 'I agree to the terms',
  },
};

export const ClickInteraction: Story = {
  args: {
    label: 'Click to toggle',
    onChange: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const checkbox = canvas.getByRole('checkbox');

    await expect(checkbox).not.toBeChecked();

    await userEvent.click(checkbox);
    await expect(args.onChange).toHaveBeenCalledTimes(1);
  },
};

export const KeyboardInteraction: Story = {
  args: {
    label: 'Press space to toggle',
    onChange: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const checkbox = canvas.getByRole('checkbox');

    await userEvent.tab();
    await expect(checkbox).toHaveFocus();

    await userEvent.keyboard(' ');
    await expect(args.onChange).toHaveBeenCalledTimes(1);
  },
};

export const Controlled: Story = {
  render: function ControlledCheckbox() {
    const [checked, setChecked] = useState(false);
    return (
      <Checkbox
        label={`Checkbox is ${checked ? 'checked' : 'unchecked'}`}
        checked={checked}
        onChange={() => setChecked(!checked)}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const checkbox = canvas.getByRole('checkbox');

    await expect(checkbox).not.toBeChecked();
    await expect(canvas.getByText('Checkbox is unchecked')).toBeInTheDocument();

    await userEvent.click(checkbox);
    await expect(checkbox).toBeChecked();
    await expect(canvas.getByText('Checkbox is checked')).toBeInTheDocument();
  },
};
