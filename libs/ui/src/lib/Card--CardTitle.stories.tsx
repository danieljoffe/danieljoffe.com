import type { Meta, StoryObj } from '@storybook/react-vite';
import { CardTitle } from './Card';

const meta: Meta<typeof CardTitle> = {
  title: 'Components/Card/CardTitle',
  component: CardTitle,
  tags: ['autodocs'],
  argTypes: {
    children: {
      description: 'Title text content',
      control: 'text',
    },
  },
};
export default meta;

type Story = StoryObj<typeof CardTitle>;

export const Default: Story = {
  args: {
    children: 'Card Title',
  },
};
