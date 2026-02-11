import type { Meta, StoryObj } from '@storybook/react-vite';
import { Container } from './Container';

const meta = {
  title: 'Layout/Container',
  component: Container,
  tags: ['autodocs'],
  argTypes: {
    size: {
      description: 'Maximum width of the container',
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl', 'full'],
      table: {
        defaultValue: { summary: 'full' },
      },
    },
  },
  decorators: [
    Story => (
      <div className='bg-background-alt'>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Container>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <div className='bg-background-elevated p-8 rounded'>
        <h2 className='text-2xl font-bold mb-4'>Default Container (full)</h2>
        <p className='text-foreground-muted'>
          This container spans the full width with horizontal padding.
        </p>
      </div>
    ),
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    children: (
      <div className='bg-background-elevated p-8 rounded'>
        <h2 className='text-2xl font-bold mb-4'>Small Container</h2>
        <p className='text-foreground-muted'>
          This container has a max-width of 3xl (768px).
        </p>
      </div>
    ),
  },
};

export const Medium: Story = {
  args: {
    size: 'md',
    children: (
      <div className='bg-background-elevated p-8 rounded'>
        <h2 className='text-2xl font-bold mb-4'>Medium Container</h2>
        <p className='text-foreground-muted'>
          This container has a max-width of 5xl (1024px).
        </p>
      </div>
    ),
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    children: (
      <div className='bg-background-elevated p-8 rounded'>
        <h2 className='text-2xl font-bold mb-4'>Large Container</h2>
        <p className='text-foreground-muted'>
          This container has a max-width of 7xl (1280px).
        </p>
      </div>
    ),
  },
};

export const ExtraLarge: Story = {
  args: {
    size: 'xl',
    children: (
      <div className='bg-background-elevated p-8 rounded'>
        <h2 className='text-2xl font-bold mb-4'>Extra Large Container</h2>
        <p className='text-foreground-muted'>
          This container has a max-width of 1400px.
        </p>
      </div>
    ),
  },
};

export const FullWidth: Story = {
  args: {
    size: 'full',
    children: (
      <div className='bg-background-elevated p-8 rounded'>
        <h2 className='text-2xl font-bold mb-4'>Full Width Container</h2>
        <p className='text-foreground-muted'>
          This container spans the full width with only horizontal padding.
        </p>
      </div>
    ),
  },
};
