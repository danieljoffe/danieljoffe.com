import type { Meta, StoryObj } from '@storybook/react-vite';
import { Dropdown } from './Dropdown';

const meta = {
  title: 'Overlay/Dropdown',
  component: Dropdown,
  tags: ['autodocs'],
  argTypes: {
    align: {
      control: 'select',
      options: ['left', 'right'],
      table: { defaultValue: { summary: 'left' } },
    },
  },
} satisfies Meta<typeof Dropdown>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    trigger: (
      <button className='px-3 py-1.5 border rounded-md text-sm'>Actions</button>
    ),
    items: [
      { label: 'Edit' },
      { label: 'Duplicate' },
      { label: '', divider: true },
      { label: 'Delete', danger: true },
    ],
  },
};

export const RightAligned: Story = {
  args: {
    trigger: (
      <button className='px-3 py-1.5 border rounded-md text-sm'>Menu</button>
    ),
    align: 'right',
    items: [
      { label: 'Profile' },
      { label: 'Settings' },
      { label: 'Sign out', danger: true },
    ],
  },
};

export const WithDisabledItems: Story = {
  args: {
    trigger: (
      <button className='px-3 py-1.5 border rounded-md text-sm'>Options</button>
    ),
    items: [
      { label: 'Available action' },
      { label: 'Disabled action', disabled: true },
    ],
  },
};
