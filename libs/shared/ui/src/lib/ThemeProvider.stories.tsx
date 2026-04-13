import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { ThemeProvider, useTheme } from './ThemeProvider';

function ThemeInfo() {
  const { theme, resolvedTheme, isDarkMode, setTheme, toggleDarkMode } =
    useTheme();
  return (
    <div className='space-y-4 p-4'>
      <div className='text-sm space-y-1'>
        <p>
          Theme: <strong data-testid='theme-value'>{theme}</strong>
        </p>
        <p>
          Resolved:{' '}
          <strong data-testid='resolved-value'>{resolvedTheme}</strong>
        </p>
        <p>
          Dark mode:{' '}
          <strong data-testid='dark-mode-value'>
            {isDarkMode ? 'Yes' : 'No'}
          </strong>
        </p>
      </div>
      <div className='flex gap-2'>
        <button
          className='px-3 py-1.5 border rounded-md text-sm'
          onClick={() => setTheme('light')}
        >
          Light
        </button>
        <button
          className='px-3 py-1.5 border rounded-md text-sm'
          onClick={() => setTheme('dark')}
        >
          Dark
        </button>
        <button
          className='px-3 py-1.5 border rounded-md text-sm'
          onClick={() => setTheme('system')}
        >
          System
        </button>
        <button
          className='px-3 py-1.5 border rounded-md text-sm'
          onClick={toggleDarkMode}
        >
          Toggle
        </button>
      </div>
    </div>
  );
}

const meta = {
  title: 'Theme/ThemeProvider',
  component: ThemeProvider,
  tags: ['autodocs'],
} satisfies Meta<typeof ThemeProvider>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: null },
  render: () => (
    <ThemeProvider>
      <ThemeInfo />
    </ThemeProvider>
  ),
};

export const SetLightTheme: Story = {
  args: { children: null },
  render: () => (
    <ThemeProvider>
      <ThemeInfo />
    </ThemeProvider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: 'Light' }));
    await waitFor(() =>
      expect(canvas.getByTestId('theme-value')).toHaveTextContent('light')
    );
  },
};

export const SetDarkTheme: Story = {
  args: { children: null },
  render: () => (
    <ThemeProvider>
      <ThemeInfo />
    </ThemeProvider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: 'Dark' }));
    await waitFor(() =>
      expect(canvas.getByTestId('theme-value')).toHaveTextContent('dark')
    );
  },
};

export const SetSystemTheme: Story = {
  args: { children: null },
  render: () => (
    <ThemeProvider>
      <ThemeInfo />
    </ThemeProvider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Set to dark first, then back to system
    await userEvent.click(canvas.getByRole('button', { name: 'Dark' }));
    await userEvent.click(canvas.getByRole('button', { name: 'System' }));
    await waitFor(() =>
      expect(canvas.getByTestId('theme-value')).toHaveTextContent('system')
    );
  },
};

export const ToggleDarkMode: Story = {
  args: { children: null },
  render: () => (
    <ThemeProvider>
      <ThemeInfo />
    </ThemeProvider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Click toggle twice to exercise both directions
    await userEvent.click(canvas.getByRole('button', { name: 'Toggle' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Toggle' }));
  },
};
