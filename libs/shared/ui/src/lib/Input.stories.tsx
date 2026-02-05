import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Input } from './Input';

const meta: Meta<typeof Input> = {
  title: 'Components/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    label: {
      description: 'Label text displayed above the input',
      control: 'text',
    },
    error: {
      description: 'Error message displayed below the input',
      control: 'text',
    },
    helperText: {
      description:
        'Helper text displayed below the input (hidden when error is shown)',
      control: 'text',
    },
    placeholder: {
      description: 'Placeholder text shown when input is empty',
      control: 'text',
    },
    disabled: {
      description: 'Disables the input',
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
  },
};

export const WithLabel: Story = {
  args: {
    label: 'Email',
    placeholder: 'Enter your email',
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'Password',
    type: 'password',
    helperText: 'Must be at least 8 characters',
  },
};

export const WithError: Story = {
  args: {
    label: 'Username',
    error: 'Username is already taken',
    defaultValue: 'johndoe',
  },
};

export const TypingInteraction: Story = {
  args: {
    label: 'Name',
    placeholder: 'Enter your name',
    onChange: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox');

    await userEvent.type(input, 'John Doe');

    await expect(input).toHaveValue('John Doe');
    await expect(args.onChange).toHaveBeenCalled();
  },
};

export const FocusInteraction: Story = {
  args: {
    label: 'Focus me',
    placeholder: 'Tab to focus',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox');

    await userEvent.tab();
    await expect(input).toHaveFocus();
  },
};

export const LabelClickFocuses: Story = {
  args: {
    label: 'Click my label',
    placeholder: 'Input will focus',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const label = canvas.getByText('Click my label');
    const input = canvas.getByRole('textbox');

    await userEvent.click(label);
    await expect(input).toHaveFocus();
  },
};

export const ErrorAccessibility: Story = {
  args: {
    label: 'Invalid Field',
    error: 'This field has an error',
    defaultValue: 'invalid',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox');
    const errorMessage = canvas.getByRole('alert');

    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(input).toHaveAttribute('aria-describedby');
    await expect(errorMessage).toBeInTheDocument();
  },
};
