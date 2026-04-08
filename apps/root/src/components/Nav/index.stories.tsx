import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ThemeProvider } from '@/state/Theme/ThemeProvider';
import Nav from './index';

const meta = {
  component: Nav,
  title: 'Components/Nav',
  tags: ['autodocs'],
  decorators: [
    Story => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
} satisfies Meta<typeof Nav>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Index: Story = {};
