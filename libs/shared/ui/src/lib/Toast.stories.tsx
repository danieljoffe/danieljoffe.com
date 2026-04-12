import type { Meta, StoryObj } from '@storybook/react-vite';
import { ToastProvider, useToast, type ToastItem } from './Toast';

function ToastDemo() {
  const { toast } = useToast();
  return (
    <div className='flex flex-wrap gap-2'>
      <button
        className='px-3 py-1.5 border rounded-md text-sm'
        onClick={() => toast({ variant: 'success', title: 'Changes saved!' })}
      >
        Success
      </button>
      <button
        className='px-3 py-1.5 border rounded-md text-sm'
        onClick={() =>
          toast({
            variant: 'error',
            title: 'Something went wrong',
            description: 'Please try again later.',
          })
        }
      >
        Error
      </button>
      <button
        className='px-3 py-1.5 border rounded-md text-sm'
        onClick={() =>
          toast({ variant: 'warning', title: 'Unsaved changes detected' })
        }
      >
        Warning
      </button>
      <button
        className='px-3 py-1.5 border rounded-md text-sm'
        onClick={() =>
          toast({
            variant: 'info',
            title: 'Tip',
            description: 'You can use keyboard shortcuts.',
          })
        }
      >
        Info
      </button>
    </div>
  );
}

const meta = {
  title: 'Feedback/Toast',
  component: ToastProvider,
  tags: ['autodocs'],
} satisfies Meta<typeof ToastProvider>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: null },
  render: () => (
    <ToastProvider>
      <ToastDemo />
    </ToastProvider>
  ),
};

function ToastTrigger({
  variant,
  title,
  description,
  label,
}: {
  variant: ToastItem['variant'];
  title: string;
  description?: string;
  label: string;
}) {
  const { toast } = useToast();
  return (
    <button
      className='px-3 py-1.5 border rounded-md text-sm'
      onClick={() =>
        toast(
          description ? { variant, title, description } : { variant, title }
        )
      }
    >
      {label}
    </button>
  );
}

export const SuccessToast: Story = {
  args: { children: null },
  render: () => (
    <ToastProvider>
      <ToastTrigger
        variant='success'
        title='Success'
        description='Operation completed.'
        label='Show Success Toast'
      />
    </ToastProvider>
  ),
};

export const ErrorToast: Story = {
  args: { children: null },
  render: () => (
    <ToastProvider>
      <ToastTrigger
        variant='error'
        title='Error'
        description='Something went wrong.'
        label='Show Error Toast'
      />
    </ToastProvider>
  ),
};

export const WarningToast: Story = {
  args: { children: null },
  render: () => (
    <ToastProvider>
      <ToastTrigger
        variant='warning'
        title='Warning'
        description='Please review your input.'
        label='Show Warning Toast'
      />
    </ToastProvider>
  ),
};

export const InfoToast: Story = {
  args: { children: null },
  render: () => (
    <ToastProvider>
      <ToastTrigger
        variant='info'
        title='Info'
        description='New updates available.'
        label='Show Info Toast'
      />
    </ToastProvider>
  ),
};

export const WithDescription: Story = {
  args: { children: null },
  render: () => (
    <ToastProvider>
      <ToastTrigger
        variant='success'
        title='Saved'
        description='Your changes have been saved successfully.'
        label='Show Toast with Description'
      />
    </ToastProvider>
  ),
};
