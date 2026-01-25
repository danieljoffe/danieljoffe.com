import type { Meta, StoryObj } from '@storybook/react-vite';
import { CardHeader } from './Card';

const meta = {
  component: CardHeader,
  title: 'CardHeader',
} satisfies Meta<typeof CardHeader>;
export default meta;

type Story = StoryObj<typeof CardHeader>;

export const Default: Story = {
  args: {
    children: 'Card Header Content',
  },
};
