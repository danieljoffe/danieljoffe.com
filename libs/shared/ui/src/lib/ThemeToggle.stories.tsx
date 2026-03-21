import type { Meta, StoryObj } from '@storybook/react-vite';
import { ThemeProvider } from './ThemeProvider';
import { ThemeToggle } from './ThemeToggle';

const meta = {
  title: 'Theme/ThemeToggle',
  component: ThemeToggle,
  tags: ['autodocs'],
  decorators: [
    Story => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
} satisfies Meta<typeof ThemeToggle>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
