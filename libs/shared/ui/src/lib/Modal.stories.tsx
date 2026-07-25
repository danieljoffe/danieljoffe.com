import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useArgs } from 'storybook/preview-api';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { Button } from './Button';
import { Modal, type ModalProps } from './Modal';

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
    placement: {
      description:
        'Dialog position: centered (default) or a bottom sheet for mobile-friendly flows',
      control: 'select',
      options: [undefined, 'center', 'sheet'],
      table: {
        defaultValue: { summary: 'center' },
      },
    },
    showCloseButton: {
      description:
        'Hide the built-in dismiss X when the content supplies its own close affordance',
      control: 'boolean',
      table: {
        defaultValue: { summary: 'true' },
      },
    },
    bodyClassName: {
      description:
        'Merged onto the scrollable body — override padding, add safe-area insets, etc.',
      control: 'text',
    },
    'aria-label': {
      description: 'Accessible name for the dialog when there is no title',
      control: 'text',
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
  parameters: {
    // Modal renders a `position: fixed inset-0` overlay. In the inline autodocs
    // preview the fixed panel is out of flow, so the preview block collapses to
    // a ~32px sliver and the modal is unreadable. Rendering each story in a
    // sized iframe gives the overlay a real viewport, so it renders centered and
    // fully visible — exactly like production. (Canvas view and interaction
    // tests are unaffected; this only changes Docs rendering.)
    docs: {
      story: { inline: false, height: '460px' },
    },
  },
  // Interactive showcase: wire `isOpen` through `useArgs` so the close button,
  // backdrop, and Escape actually dismiss the modal (and a trigger re-opens it),
  // instead of `onClose` being a no-op spy against a hardcoded `isOpen: true`.
  render: function Render(args) {
    const [, updateArgs] = useArgs<ModalProps>();
    return (
      <>
        <Button onClick={() => updateArgs({ isOpen: true })}>Open modal</Button>
        <Modal
          {...args}
          onClose={() => {
            updateArgs({ isOpen: false });
            args.onClose?.();
          }}
        />
      </>
    );
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

/**
 * `placement='sheet'` anchors the dialog to the bottom edge — a mobile
 * bottom-sheet with `rounded-t` corners that slides up from the bottom on
 * open and slides back out on close, while keeping Modal's focus trap,
 * scroll lock, and backdrop behavior.
 */
export const BottomSheet: Story = {
  args: {
    isOpen: true,
    title: 'Filter jobs',
    placement: 'sheet',
    children:
      'A bottom sheet keeps thumb-reach actions at the bottom of the screen on mobile.',
    footer: <Button name='apply-filters'>Apply filters</Button>,
    onClose: fn(),
  },
};

/**
 * Closing a sheet plays a slide-out exit before it unmounts (centered
 * dialogs close instantly). While exiting, the sheet is inert and the
 * backdrop is already gone.
 */
export const SheetExitAnimation: Story = {
  args: {
    isOpen: false,
    onClose: fn(),
    children: null,
  },
  render: function SheetExitDemo() {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Open sheet</Button>
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          placement='sheet'
          title='Slides out on close'
        >
          Close this sheet (X, Escape, or backdrop) and it slides back down
          before unmounting.
        </Modal>
      </>
    );
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('Open the sheet', async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Open sheet' }));
      await waitFor(() =>
        expect(canvas.getByRole('dialog')).toBeInTheDocument()
      );
    });

    await step(
      'Close: exit phase keeps it mounted, then it unmounts',
      async () => {
        await userEvent.click(
          canvas.getByRole('button', { name: 'Close dialog' })
        );
        // Still present mid-exit (inert), gone once the slide-out finishes
        await expect(
          canvas.getByRole('dialog', { hidden: true })
        ).toBeInTheDocument();
        await waitFor(() =>
          expect(canvas.queryByRole('dialog', { hidden: true })).toBeNull()
        );
      }
    );
  },
};

export const ScrollableContent: Story = {
  // Long-form content — give the docs preview iframe extra height so more of
  // the tall modal is visible.
  parameters: {
    docs: {
      story: { height: '640px' },
    },
  },
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
    const dialog = canvas.getByRole('dialog');

    await expect(dialog).toBeInTheDocument();

    // Click the dialog body to ensure focus is inside
    await userEvent.click(dialog);

    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalled();
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
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('Verify modal is closed initially', async () => {
      await expect(canvas.queryByRole('dialog')).not.toBeInTheDocument();
    });

    await step('Open modal', async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Open Modal' }));
      await waitFor(() =>
        expect(canvas.getByRole('dialog')).toBeInTheDocument()
      );
    });

    await step('Close modal', async () => {
      await userEvent.click(
        canvas.getByRole('button', { name: 'Close dialog' })
      );
      await waitFor(() =>
        expect(canvas.queryByRole('dialog')).not.toBeInTheDocument()
      );
    });
  },
};
