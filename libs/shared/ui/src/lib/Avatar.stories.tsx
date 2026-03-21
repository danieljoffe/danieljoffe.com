import type { Meta, StoryObj } from '@storybook/react-vite';
import { Avatar } from './Avatar';

const meta = {
  title: 'Data Display/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      table: { defaultValue: { summary: 'md' } },
    },
    status: {
      control: 'select',
      options: [undefined, 'online', 'offline', 'away', 'busy'],
    },
  },
} satisfies Meta<typeof Avatar>;
export default meta;

type Story = StoryObj<typeof meta>;

export const WithInitials: Story = {
  args: { initials: 'DJ', size: 'md' },
};

export const WithImage: Story = {
  args: {
    src: 'https://i.pravatar.cc/150?img=3',
    alt: 'User avatar',
    size: 'md',
  },
};

export const WithStatus: Story = {
  args: { initials: 'DJ', status: 'online', size: 'lg' },
};

export const AllSizes: Story = {
  render: () => (
    <div className='flex items-end gap-4'>
      <Avatar initials='XS' size='xs' />
      <Avatar initials='SM' size='sm' />
      <Avatar initials='MD' size='md' />
      <Avatar initials='LG' size='lg' />
      <Avatar initials='XL' size='xl' />
    </div>
  ),
};

export const Fallback: Story = {
  args: { alt: 'Daniel' },
};
