import type { Meta, StoryObj } from '@storybook/react-vite';
import { CardContent } from './Card';

const meta: Meta<typeof CardContent> = {
  title: 'Components/Card/CardContent',
  component: CardContent,
  tags: ['autodocs'],
  argTypes: {
    children: {
      description: 'Content area of the card',
      control: 'text',
    },
  },
};
export default meta;

type Story = StoryObj<typeof CardContent>;

export const Default: Story = {
  args: {
    children: 'This is the card content area where you can place any content.',
  },
};
