import type { Meta, StoryObj } from '@storybook/react-vite';
import { Spacer } from './Spacer';

const meta = {
  title: 'Layout/Spacer',
  component: Spacer,
  tags: ['autodocs'],
  argTypes: {
    size: {
      description: 'The vertical height of the spacer',
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl', '2xl'],
      table: {
        defaultValue: { summary: 'md' },
      },
    },
  },
  decorators: [
    Story => (
      <div className='bg-surface-elevated p-4'>
        <div className='bg-brand-500 h-8 rounded' />
        <Story />
        <div className='bg-brand-500 h-8 rounded' />
      </div>
    ),
  ],
} satisfies Meta<typeof Spacer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const ExtraSmall: Story = {
  args: {
    size: 'xs',
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
  },
};

export const Medium: Story = {
  args: {
    size: 'md',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
  },
};

export const ExtraLarge: Story = {
  args: {
    size: 'xl',
  },
};

export const ExtraExtraLarge: Story = {
  args: {
    size: '2xl',
  },
};
