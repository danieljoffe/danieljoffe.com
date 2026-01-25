import type { Meta, StoryObj } from '@storybook/react-vite';
import { CardContent } from './Card';

const meta = {
  component: CardContent,
  title: 'CardContent',
} satisfies Meta<typeof CardContent>;
export default meta;

type Story = StoryObj<typeof CardContent>;

export const Default: Story = {
  args: {
    children: 'This is the card content area where you can place any content.',
  },
};
