import type { Meta, StoryObj } from '@storybook/react-vite';
import { Avatar } from './Avatar';

const meta = {
  title: 'Data Display/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      table: { defaultValue: { summary: 'md' } },
    },
    shape: {
      control: 'select',
      options: [undefined, 'circle', 'square'],
      table: { defaultValue: { summary: 'circle' } },
    },
    status: {
      control: 'select',
      options: [undefined, 'online', 'offline', 'away', 'busy'],
    },
    tileClassName: {
      description:
        'Merged onto the inner tile after the defaults — override bg/text for a per-entity color',
      control: 'text',
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
      <Avatar initials='SM' size='sm' />
      <Avatar initials='MD' size='md' />
      <Avatar initials='LG' size='lg' />
    </div>
  ),
};

export const Fallback: Story = {
  args: { alt: 'Daniel' },
};

export const Square: Story = {
  args: { initials: 'DJ', shape: 'square' },
};

/**
 * `tileClassName` overrides the tile's default `bg-*`/`text-*`, enabling a
 * deterministic per-entity color (e.g. a stable hue per company in a list).
 */
export const PerEntityColors: Story = {
  render: () => (
    <div className='flex items-center gap-4'>
      <Avatar initials='AC' tileClassName='bg-sky-100 text-sky-700' />
      <Avatar initials='GL' tileClassName='bg-emerald-100 text-emerald-700' />
      <Avatar initials='VN' tileClassName='bg-amber-100 text-amber-700' />
      <Avatar initials='ST' tileClassName='bg-rose-100 text-rose-700' />
    </div>
  ),
};

export const Online: Story = {
  args: { initials: 'ON', status: 'online', size: 'md' },
};

export const Offline: Story = {
  args: { initials: 'OF', status: 'offline', size: 'md' },
};

export const Away: Story = {
  args: { initials: 'AW', status: 'away', size: 'md' },
};

export const Busy: Story = {
  args: { initials: 'BS', status: 'busy', size: 'md' },
};
