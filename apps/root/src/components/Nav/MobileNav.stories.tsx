import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import MobileNav from './MobileNav';

const meta = {
  component: MobileNav,
  title: 'Components/Nav/MobileNav',
  tags: ['autodocs'],
  argTypes: {
    pathname: {
      description: 'Current pathname to highlight active link',
      options: ['/', '/projects', '/experience', '/about'],
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

export const ActiveProjects: Story = {
  args: {
    pathname: '/projects',
  },
};
