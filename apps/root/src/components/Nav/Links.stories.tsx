import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import NavLinks from './Links';

const meta = {
  component: NavLinks,
  title: 'Components/Nav/Links',
  tags: ['autodocs'],
  argTypes: {
    handleClick: {
      description: 'Callback when a navigation link is clicked',
    },
    pathname: {
      description: 'Current pathname to highlight active link',
      options: ['/', '/about', '/projects'],
      control: 'select',
    },
  },
  decorators: [
    (Story, { args }) => {
      return <Story pathname={args.pathname} />;
    },
  ],
} satisfies Meta<typeof NavLinks>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    handleClick: fn(),
  },
};
