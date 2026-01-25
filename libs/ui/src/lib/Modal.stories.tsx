import type { Meta, StoryObj } from '@storybook/react-vite';
import { Modal } from './Modal';

const meta = {
  component: Modal,
  title: 'Modal',
  argTypes: {
    variant: {
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
    },
    size: {
      control: 'select',
      options: [undefined, 'sm', 'md', 'lg', 'xl'],
    },
    onClose: { action: 'onClose executed!' },
  },
} satisfies Meta<typeof Modal>;
export default meta;

type Story = StoryObj<typeof Modal>;

export const Default: Story = {
  args: {
    isOpen: true,
    title: 'Modal Title',
    children: 'This is the modal content.',
  },
};

export const WithFooter: Story = {
  args: {
    isOpen: true,
    title: 'Confirm Action',
    children: 'Are you sure you want to proceed with this action?',
    size: 'md',
    variant: 'default',
  },
};

export const AccentVariant: Story = {
  args: {
    isOpen: true,
    title: 'Important Notice',
    children: 'This modal uses the accent variant.',
    size: 'md',
    variant: 'accent',
  },
};

export const Large: Story = {
  args: {
    isOpen: true,
    title: 'Large Modal',
    children: 'This is a large modal with more content space.',
    size: 'lg',
    variant: 'default',
  },
};
