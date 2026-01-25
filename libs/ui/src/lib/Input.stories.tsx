import type { Meta, StoryObj } from '@storybook/react-vite';
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
