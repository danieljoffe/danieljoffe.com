import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from './Badge';

const meta = {
  title: 'Feedback/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      description: 'Visual style of the badge',
      control: 'select',
      options: [
        undefined,
        'default',
        'success',
        'warning',
        'error',
        'info',
        'brand',
        'brand-solid',
      ],
      table: {
        defaultValue: { summary: 'default' },
      },
    },
    size: {
      description: 'Size of the badge',
      control: 'select',
      options: ['sm', 'md', 'lg'],
      table: {
        defaultValue: { summary: 'md' },
      },
    },
    children: {
      description: 'Badge text content',
      control: 'text',
    },
  },
} satisfies Meta<typeof Badge>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Badge',
  },
};

export const Success: Story = {
  args: {
    children: 'Success',
    variant: 'success',
  },
};

export const Warning: Story = {
  args: {
    children: 'Warning',
    variant: 'warning',
  },
};

export const Error: Story = {
  args: {
    children: 'Error',
    variant: 'error',
  },
};

export const Info: Story = {
  args: {
    children: 'Info',
    variant: 'info',
  },
};

export const Brand: Story = {
  args: {
    children: 'Brand',
    variant: 'brand',
  },
};

export const BrandSolid: Story = {
  args: {
    children: 'Brand Solid',
    variant: 'brand-solid',
  },
};

export const Small: Story = {
  args: {
    children: 'Small',
    size: 'sm',
  },
};

export const Large: Story = {
  args: {
    children: 'Large',
    size: 'lg',
  },
};

export const AllVariants: Story = {
  args: {
    children: '',
  },
  render: () => (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <Badge>Default</Badge>
      <Badge variant='success'>Success</Badge>
      <Badge variant='warning'>Warning</Badge>
      <Badge variant='error'>Error</Badge>
      <Badge variant='info'>Info</Badge>
      <Badge variant='brand'>Brand</Badge>
      <Badge variant='brand-solid'>Brand Solid</Badge>
    </div>
  ),
};
