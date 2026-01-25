import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from '@storybook/test';
import { Alert } from './Alert';

const meta: Meta<typeof Alert> = {
  title: 'Components/Alert',
  component: Alert,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      description: 'Visual style indicating the type of alert',
      control: 'select',
      options: [undefined, 'info', 'success', 'warning', 'error'],
      table: {
        defaultValue: { summary: 'info' },
      },
    },
    title: {
      description: 'Optional title displayed at the top of the alert',
      control: 'text',
    },
    dismissible: {
      description: 'Whether the alert can be dismissed by the user',
      control: 'boolean',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
    onDismiss: {
      description: 'Callback fired when dismiss button is clicked',
      action: 'onDismiss executed!',
    },
    children: {
      description: 'Alert message content',
      control: 'text',
    },
  },
};

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

export const DismissInteraction: Story = {
  args: {
    children: 'Click the X to dismiss this alert.',
    variant: 'info',
    title: 'Dismissible',
    dismissible: true,
    onDismiss: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const dismissButton = canvas.getByRole('button', { name: 'Dismiss alert' });

    await userEvent.click(dismissButton);
    await expect(args.onDismiss).toHaveBeenCalledTimes(1);
  },
};

export const UrgentAlertRole: Story = {
  args: {
    children: 'This is an urgent error message.',
    variant: 'error',
    title: 'Critical Error',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const alert = canvas.getByRole('alert');

    await expect(alert).toBeInTheDocument();
    await expect(alert).toHaveAttribute('aria-live', 'assertive');
  },
};

export const StatusAlertRole: Story = {
  args: {
    children: 'This is an informational message.',
    variant: 'info',
    title: 'Information',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const status = canvas.getByRole('status');

    await expect(status).toBeInTheDocument();
    await expect(status).toHaveAttribute('aria-live', 'polite');
  },
};
