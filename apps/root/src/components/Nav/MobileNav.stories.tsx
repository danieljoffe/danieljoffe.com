import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import MobileNav from './MobileNav';

const meta = {
  component: MobileNav,
  title: 'Components/Nav/MobileNav',
  tags: ['autodocs'],
  argTypes: {
    pathname: {
      description: 'Current pathname to highlight active link',
      options: ['/', '/services', '/projects', '/experience', '/about'],
      control: 'select',
    },
  },
} satisfies Meta<typeof MobileNav>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    pathname: '/',
  },
};

export const ActiveService: Story = {
  args: {
    pathname: '/services',
  },
};
