import type { Meta, StoryObj } from '@storybook/react-vite';
import { PageContainer } from './PageContainer';

const meta = {
  title: 'Layout/PageContainer',
  component: PageContainer,
  tags: ['autodocs'],
  argTypes: {
    size: {
      description: 'Maximum width of the inner container',
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl', 'full'],
      table: {
        defaultValue: { summary: 'sm' },
      },
    },
    wrapperClassName: {
      description: 'Additional classes for the outer wrapper',
      control: 'text',
    },
    className: {
      description: 'Additional classes for the inner container',
      control: 'text',
    },
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'A page layout container that centers content with consistent padding. Wraps the Container component with additional layout styling for full-page sections.',
      },
    },
  },
  decorators: [
    Story => (
      <div className='bg-surface-secondary min-h-[400px]'>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PageContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <div className='bg-surface-elevated p-8 rounded'>
        <h2 className='text-2xl font-bold mb-4'>Default PageContainer</h2>
        <p className='text-text-secondary'>
          This container is centered with vertical padding and a default
          max-width of sm (768px).
        </p>
      </div>
    ),
  },
};

export const Medium: Story = {
  args: {
    size: 'md',
    children: (
      <div className='bg-surface-elevated p-8 rounded'>
        <h2 className='text-2xl font-bold mb-4'>Medium PageContainer</h2>
        <p className='text-text-secondary'>
          This container has a max-width of md (1024px).
        </p>
      </div>
    ),
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    children: (
      <div className='bg-surface-elevated p-8 rounded'>
        <h2 className='text-2xl font-bold mb-4'>Large PageContainer</h2>
        <p className='text-text-secondary'>
          This container has a max-width of lg (1280px).
        </p>
      </div>
    ),
  },
};

export const WithBackgroundWrapper: Story = {
  args: {
    wrapperClassName: 'bg-brand-500',
    children: (
      <div className='bg-surface-elevated p-8 rounded'>
        <h2 className='text-2xl font-bold mb-4'>With Background Wrapper</h2>
        <p className='text-text-secondary'>
          The outer wrapper has a custom background color applied via
          wrapperClassName.
        </p>
      </div>
    ),
  },
};

export const WithCustomInnerClass: Story = {
  args: {
    className: 'gap-8',
    children: (
      <>
        <div className='bg-surface-elevated p-8 rounded'>
          <h2 className='text-2xl font-bold'>First Section</h2>
          <p className='text-text-secondary'>Content in the first section.</p>
        </div>
        <div className='bg-surface-elevated p-8 rounded'>
          <h2 className='text-2xl font-bold'>Second Section</h2>
          <p className='text-text-secondary'>Content in the second section.</p>
        </div>
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Custom className applied to the inner container for spacing between children.',
      },
    },
  },
};

export const FullWidth: Story = {
  args: {
    size: 'full',
    children: (
      <div className='bg-surface-elevated p-8 rounded'>
        <h2 className='text-2xl font-bold mb-4'>Full Width PageContainer</h2>
        <p className='text-text-secondary'>
          This container spans the full width with only padding constraints.
        </p>
      </div>
    ),
  },
};
