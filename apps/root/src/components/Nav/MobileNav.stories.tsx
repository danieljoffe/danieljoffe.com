import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import MobileNav from './MobileNav';

const meta = {
  component: MobileNav,
  title: 'Components/Nav/MobileNav',
  tags: ['autodocs'],
  argTypes: {
    menuOpen: {
      description: 'Whether the mobile menu is open',
      control: 'boolean',
    },
    setMenuOpen: {
      description: 'Callback to toggle the mobile menu',
    },
  },
} satisfies Meta<typeof MobileNav>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Closed: Story = {
  args: {
    menuOpen: false,
    setMenuOpen: fn(),
  },
};

export const Open: Story = {
  args: {
    menuOpen: true,
    setMenuOpen: fn(),
  },
};
