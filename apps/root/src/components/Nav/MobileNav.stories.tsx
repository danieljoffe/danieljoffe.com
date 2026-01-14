import type { Meta, StoryObj } from '@storybook/react';
import MobileNav from './MobileNav';

const meta = {
  component: MobileNav,
  title: 'Nav/MobileNav',
  argTypes: {
    setMenuOpen: { action: 'setMenuOpen executed!' },
  },
} satisfies Meta<typeof MobileNav>;
export default meta;

type Story = StoryObj<typeof MobileNav>;

export const Primary = {
  args: {
    menuOpen: false,
  },
} satisfies Story;
