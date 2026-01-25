import type { Meta, StoryObj } from '@storybook/react-vite';
import { CardHeader } from './Card';

const meta: Meta<typeof CardHeader> = {
  title: 'Components/Card/CardHeader',
  component: CardHeader,
  tags: ['autodocs'],
  argTypes: {
    children: {
      description: 'Header content (typically contains CardTitle)',
      control: 'text',
    },
  },
};
export default meta;

type Story = StoryObj<typeof CardHeader>;

export const Default: Story = {
  args: {
    children: 'Card Header Content',
  },
};
