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

export const Small: Story = {
  args: {
    isOpen: true,
    title: 'Small Modal',
    children: 'This is a small modal with compact content.',
    size: 'sm',
    onClose: fn(),
  },
};

export const ExtraLarge: Story = {
  args: {
    isOpen: true,
    title: 'Extra Large Modal',
    children: 'This is an extra large modal with maximum content space.',
    size: 'xl',
    onClose: fn(),
  },
};

export const ScrollableContent: Story = {
  args: {
    isOpen: true,
    title: 'Scrollable Content',
    size: 'md',
    onClose: fn(),
    children: [
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
      '\n\n',
      'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
      '\n\n',
      'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.',
      '\n\n',
      'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet.',
      '\n\n',
      'Consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam.',
      '\n\n',
      'At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.',
      '\n\n',
      'Similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga. Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit.',
      '\n\n',
      'Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae. Itaque earum rerum hic tenetur a sapiente delectus.',
    ].join(''),
  },
};

export const EscapeKeyClose: Story = {
  args: {
    isOpen: true,
    title: 'Press Escape to Close',
    children: 'Press the Escape key to close this modal.',
    onClose: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('dialog')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalledTimes(1);
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
