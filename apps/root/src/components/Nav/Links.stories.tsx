import type { Meta, StoryObj } from '@storybook/react';
import NavLinks from './Links';

const meta = {
  component: NavLinks,
  title: 'Nav/Links',
  argTypes: {
    handleClick: { action: 'handleClick executed!' },
    pathname: {
      options: ['/', '/about', '/projects'],
      control: 'select',
    },
  },
  decorators: [
    (Story, { args }) => {
      return <Story pathname={args.pathname} />;
    },
  ],
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof NavLinks>;

export const Primary = {} satisfies Story;
