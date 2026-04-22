'use client';

import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { ModalErrorBoundary } from './ModalErrorBoundary';

function ThrowOnClick({ label }: { label: string }) {
  const [shouldThrow, setShouldThrow] = useState(false);
  if (shouldThrow) throw new Error('Simulated modal error');
  return (
    <button onClick={() => setShouldThrow(true)} name='trigger-error'>
      {label}
    </button>
  );
}

const meta = {
  title: 'Utils/ModalErrorBoundary',
  component: ModalErrorBoundary,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Specialized error boundary for Modal components. Restores body scroll on error to prevent the app from getting stuck in a scroll-locked state.',
      },
    },
  },
} satisfies Meta<typeof ModalErrorBoundary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: <p>Modal content renders normally.</p>,
  },
};

export const WithFallback: Story = {
  args: {
    fallback: (
      <div role='alert'>
        <p>Modal crashed. Please close and try again.</p>
      </div>
    ),
    children: <ThrowOnClick label='Trigger modal error' />,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', {
      name: 'Trigger modal error',
    });

    await userEvent.click(button);

    const alert = canvas.getByRole('alert');
    await expect(alert).toBeInTheDocument();
    await expect(alert).toHaveTextContent(
      'Modal crashed. Please close and try again.'
    );
  },
};
