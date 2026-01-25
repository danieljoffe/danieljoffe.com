import type { Meta, StoryObj } from '@storybook/react-vite';
import { CardTitle } from './Card';

const meta = {
  component: CardTitle,
  title: 'CardTitle',
} satisfies Meta<typeof CardTitle>;
export default meta;

type Story = StoryObj<typeof CardTitle>;

export const Default: Story = {
  args: {
    children: 'Card Title',
  },
};
