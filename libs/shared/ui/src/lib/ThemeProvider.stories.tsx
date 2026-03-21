import type { Meta, StoryObj } from '@storybook/react-vite';
import { ThemeProvider, useTheme } from './ThemeProvider';

function ThemeInfo() {
  const { theme, resolvedTheme, isDarkMode, setTheme, toggleDarkMode } =
    useTheme();
  return (
    <div className='space-y-4 p-4'>
      <div className='text-sm space-y-1'>
        <p>
          Theme: <strong>{theme}</strong>
        </p>
        <p>
          Resolved: <strong>{resolvedTheme}</strong>
        </p>
        <p>
          Dark mode: <strong>{isDarkMode ? 'Yes' : 'No'}</strong>
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
  render: () => (
    <ThemeProvider>
      <ThemeInfo />
    </ThemeProvider>
  ),
};
