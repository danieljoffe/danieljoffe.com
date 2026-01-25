import type { Meta, StoryObj } from '@storybook/react-vite';
import { Alert } from './Alert';

const meta = {
  component: Alert,
  title: 'Alert',
  argTypes: {
    variant: {
      control: 'select',
      options: [undefined, 'info', 'success', 'warning', 'error'],
    },
    onDismiss: { action: 'onDismiss executed!' },
  },
} satisfies Meta<typeof Alert>;
export default meta;

type Story = StoryObj<typeof Alert>;

export const Default: Story = {
  args: {
    children: 'This is an alert message.',
    title: 'Alert Title',
    dismissible: false,
  },
};

export const Dismissible: Story = {
  args: {
    children: 'This alert can be dismissed.',
    variant: 'info',
    title: 'Dismissible Alert',
    dismissible: true,
  },
};

export const Success: Story = {
  args: {
    children: 'Operation completed successfully.',
    variant: 'success',
    title: 'Success',
    dismissible: false,
  },
};

export const Error: Story = {
  args: {
    children: 'An error occurred. Please try again.',
    variant: 'error',
    title: 'Error',
    dismissible: true,
  },
};
