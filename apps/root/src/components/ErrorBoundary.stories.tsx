import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect } from 'storybook/test';
import ErrorBoundary from './ErrorBoundary';

const meta = {
  component: ErrorBoundary,
  title: 'Components/ErrorBoundary',
  tags: ['autodocs'],
  parameters: {
    nextjs: {
      appDirectory: true,
    },
  },
  argTypes: {
    children: {
      description: 'Content to render inside the error boundary',
    },
    fallback: {
      description: 'Custom fallback component to render on error',
    },
  },
  decorators: [
    Story => (
      <div className='flex p-4 w-full h-full'>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ErrorBoundary>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Dormant: Story = {
  args: {
    children: <h1>Content to show</h1>,
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.textContent).toMatch(/Content to show/gi);
  },
};

const ComponentWithError = () => {
  throw new Error('Test error');
};

export const Triggered: Story = {
  args: {
    children: <ComponentWithError />,
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.textContent).not.toMatch(/Content to show/gi);
    await expect(canvasElement.textContent).toMatch(/Something went wrong/gi);
  },
};
