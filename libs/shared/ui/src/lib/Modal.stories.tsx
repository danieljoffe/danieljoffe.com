import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Button } from './Button';
import { Modal } from './Modal';

const meta = {
  title: 'Overlay/Modal',
  component: Modal,
  tags: ['autodocs'],
  argTypes: {
    isOpen: {
      description: 'Controls whether the modal is visible',
      control: 'boolean',
    },
    title: {
      description: 'Optional title displayed in the modal header',
      control: 'text',
    },
    size: {
      description: 'Width of the modal',
      control: 'select',
      options: [undefined, 'sm', 'md', 'lg', 'xl'],
      table: {
        defaultValue: { summary: 'md' },
      },
    },
    variant: {
      description: 'Visual style of the modal',
      control: 'select',
      options: [
        undefined,
        'default',
        'accent',
        'success',
        'warning',
        'error',
        'info',
      ],
      table: {
        defaultValue: { summary: 'default' },
      },
    },
    onClose: {
      description:
        'Callback fired when modal is closed (via backdrop click, Escape key, or close button)',
      action: 'onClose executed!',
    },
    children: {
      description: 'Modal body content',
      control: 'text',
    },
    footer: {
      description: 'Optional footer content (typically action buttons)',
    },
  },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isOpen: true,
    title: 'Modal Title',
    children: 'This is the modal content.',
    onClose: fn(),
  },
};

export const WithFooter: Story = {
  args: {
    isOpen: true,
    title: 'Confirm Action',
    children: 'Are you sure you want to proceed with this action?',
    size: 'md',
    variant: 'default',
    onClose: fn(),
  },
};

export const AccentVariant: Story = {
  args: {
    isOpen: true,
    title: 'Important Notice',
    children: 'This modal uses the accent variant.',
    size: 'md',
    variant: 'accent',
    onClose: fn(),
  },
};

export const Large: Story = {
  args: {
    isOpen: true,
    title: 'Large Modal',
    children: 'This is a large modal with more content space.',
    size: 'lg',
    variant: 'default',
    onClose: fn(),
  },
};

export const CloseButtonInteraction: Story = {
  args: {
    isOpen: true,
    title: 'Close with Button',
    children: 'Click the X button to close this modal.',
    onClose: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const closeButton = canvas.getByRole('button', { name: 'Close dialog' });

    await expect(canvas.getByRole('dialog')).toBeInTheDocument();

    await userEvent.click(closeButton);
    await expect(args.onClose).toHaveBeenCalledTimes(1);
  },
};

export const AccessibilityAttributes: Story = {
  args: {
    isOpen: true,
    title: 'Accessible Modal',
    children: 'This modal has proper accessibility attributes.',
    onClose: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const dialog = canvas.getByRole('dialog');

    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog).toHaveAttribute('aria-labelledby');
  },
};

export const Controlled: Story = {
  args: {
    isOpen: false,
    onClose: fn(),
    children: null,
  },
  render: function ControlledModal() {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title='Controlled Modal'
        >
          This modal is controlled by state.
        </Modal>
      </>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Modal should not be visible initially
    await expect(canvas.queryByRole('dialog')).not.toBeInTheDocument();

    // Open modal
    await userEvent.click(canvas.getByRole('button', { name: 'Open Modal' }));
    await expect(canvas.getByRole('dialog')).toBeInTheDocument();

    // Close modal
    await userEvent.click(canvas.getByRole('button', { name: 'Close dialog' }));
    await expect(canvas.queryByRole('dialog')).not.toBeInTheDocument();
  },
};
