'use client';

import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { ErrorBoundary } from './ErrorBoundary';

function ThrowOnClick({ label }: { label: string }) {
  const [shouldThrow, setShouldThrow] = useState(false);
  if (shouldThrow) throw new Error('Simulated render error');
  return (
    <button onClick={() => setShouldThrow(true)} name='trigger-error'>
      {label}
    </button>
  );
}

const meta = {
  title: 'Utils/ErrorBoundary',
  component: ErrorBoundary,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Generic error boundary that catches render errors in child components and shows a fallback.',
      },
    },
  },
} satisfies Meta<typeof ErrorBoundary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: <p>Child content renders normally.</p>,
  },
};

export const WithFallback: Story = {
  args: {
    fallback: (
      <div role='alert'>
        <p>Something went wrong.</p>
      </div>
    ),
    children: <ThrowOnClick label='Trigger error' />,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: 'Trigger error' });

    await userEvent.click(button);

    const alert = canvas.getByRole('alert');
    await expect(alert).toBeInTheDocument();
    await expect(alert).toHaveTextContent('Something went wrong.');
  },
};

export const WithoutFallback: Story = {
  args: {
    children: <ThrowOnClick label='Trigger error (no fallback)' />,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', {
      name: 'Trigger error (no fallback)',
    });

    await userEvent.click(button);

    // Without a fallback, ErrorBoundary renders null — button should be gone
    await expect(button).not.toBeInTheDocument();
  },
};
