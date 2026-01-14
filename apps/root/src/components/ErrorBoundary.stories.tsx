import type { Meta, StoryObj } from '@storybook/react';
import ErrorBoundary from './ErrorBoundary';
import { expect } from 'storybook/test';

const meta: Meta<typeof ErrorBoundary> = {
  component: ErrorBoundary,
  title: 'ErrorBoundary',
  parameters: {
    nextjs: {
      appDirectory: true,
    },
  },
  decorators: [
    Story => (
      <div className='flex p-4 w-full h-full'>
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof ErrorBoundary>;

// Dormant: ErrorBoundary wraps normal content, no error thrown
export const Dormant: Story = {
  args: {
    children: <h1>Content to show</h1>,
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.textContent).toMatch(/Content to show/gi);
  },
};

// Triggered: ErrorBoundary wraps a component that throws, so content is not shown
const ComponentWithError = () => {
  throw new Error('Test error');
};

export const Triggered: Story = {
  args: {
    children: <ComponentWithError />,
  },
  play: async ({ canvasElement }) => {
    // The error boundary fallback should be rendered, not the original content
    await expect(canvasElement.textContent).not.toMatch(/Content to show/gi);
    // Optionally, check for fallback text
    await expect(canvasElement.textContent).toMatch(/Something went wrong/gi);
  },
};
