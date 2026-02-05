import type { Meta, StoryObj } from '@storybook/react';
import MobileNav from './MobileNav';

const meta = {
  component: MobileNav,
  title: 'Components/Nav/MobileNav',
  argTypes: {
    setMenuOpen: { action: 'setMenuOpen executed!' },
  },
} satisfies Meta<typeof MobileNav>;
export default meta;

type Story = StoryObj<typeof MobileNav>;

export const Closed: Story = {
  args: {
    menuOpen: false,
  },
};

export const Open: Story = {
  args: {
    menuOpen: true,
  },
};
