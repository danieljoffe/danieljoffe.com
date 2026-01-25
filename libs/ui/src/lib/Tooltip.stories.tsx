import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tooltip } from './Tooltip';

const meta = {
  component: Tooltip,
  title: 'Tooltip',
  argTypes: {
    position: {
      control: 'select',
      options: [undefined, 'top', 'bottom', 'left', 'right'],
    },
  },
} satisfies Meta<typeof Tooltip>;
export default meta;

type Story = StoryObj<typeof Tooltip>;

export const Default: Story = {
  args: {
    content: 'This is a tooltip',
    children: 'Hover me',
  },
};

export const Bottom: Story = {
  args: {
    content: 'Tooltip on bottom',
    children: 'Hover me',
    position: 'bottom',
  },
};

export const WithDelay: Story = {
  args: {
    content: 'Delayed tooltip',
    children: 'Hover me (500ms delay)',
    delay: 500,
  },
};
