import type { Meta, StoryObj } from '@storybook/react-vite';
import { ToastProvider, useToast } from './Toast';

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
