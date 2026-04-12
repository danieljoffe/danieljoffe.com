import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
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

export const ClickLight: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const lightButton = canvas.getByTitle('Light');
    await userEvent.click(lightButton);
    await expect(lightButton).toHaveClass('bg-surface');
  },
};

export const ClickDark: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const darkButton = canvas.getByTitle('Dark');
    await userEvent.click(darkButton);
    await expect(darkButton).toHaveClass('bg-surface');
  },
};

export const ClickSystem: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const systemButton = canvas.getByTitle('System');
    await userEvent.click(systemButton);
    await expect(systemButton).toHaveClass('bg-surface');
  },
};

export const ThreeButtons: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // All three theme options should be present
    await expect(canvas.getByTitle('Light')).toBeInTheDocument();
    await expect(canvas.getByTitle('Dark')).toBeInTheDocument();
    await expect(canvas.getByTitle('System')).toBeInTheDocument();
  },
};
