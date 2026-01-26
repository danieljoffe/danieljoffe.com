import type { Meta, StoryObj } from '@storybook/react-vite';
import { Spacer } from './Spacer';

const meta: Meta<typeof Spacer> = {
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
      <div className='bg-background-elevated p-4'>
        <div className='bg-accent h-8 rounded' />
        <Story />
        <div className='bg-accent h-8 rounded' />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Spacer>;

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
