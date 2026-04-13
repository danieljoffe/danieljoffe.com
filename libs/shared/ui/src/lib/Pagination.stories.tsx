import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Pagination } from './Pagination';

const meta = {
  title: 'Navigation/Pagination',
  component: Pagination,
  tags: ['autodocs'],
} satisfies Meta<typeof Pagination>;
export default meta;

type Story = StoryObj<typeof meta>;

const noop = () => {};

export const Default: Story = {
  args: { currentPage: 1, totalPages: 10, onPageChange: noop },
};

export const MiddlePage: Story = {
  args: { currentPage: 5, totalPages: 10, onPageChange: noop },
};

export const FewPages: Story = {
  args: { currentPage: 2, totalPages: 3, onPageChange: noop },
};

export const ManyPages: Story = {
  args: { currentPage: 10, totalPages: 50, onPageChange: noop },
};

export const Interactive: Story = {
  args: { currentPage: 1, totalPages: 20, onPageChange: noop },
  render: () => {
    const [page, setPage] = useState(1);
    return (
      <Pagination currentPage={page} totalPages={20} onPageChange={setPage} />
    );
  },
};

export const ClickPage: Story = {
  args: { currentPage: 1, totalPages: 5, onPageChange: fn() },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    // Click page 3
    await userEvent.click(canvas.getByRole('button', { name: 'Go to page 3' }));
    await expect(args.onPageChange).toHaveBeenCalledWith(3);
  },
};

export const NextPrevious: Story = {
  args: { currentPage: 3, totalPages: 5, onPageChange: fn() },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    // Click next
    await userEvent.click(canvas.getByRole('button', { name: 'Next page' }));
    await expect(args.onPageChange).toHaveBeenCalledWith(4);

    // Click previous
    await userEvent.click(
      canvas.getByRole('button', { name: 'Previous page' })
    );
    await expect(args.onPageChange).toHaveBeenCalledWith(2);
  },
};

export const DisabledAtBounds: Story = {
  args: { currentPage: 1, totalPages: 5, onPageChange: fn() },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    // Previous button should be disabled on first page
    const prevButton = canvas.getByRole('button', { name: 'Previous page' });
    await expect(prevButton).toBeDisabled();
    await expect(args.onPageChange).not.toHaveBeenCalled();
  },
};

export const CurrentPageIndicator: Story = {
  args: { currentPage: 3, totalPages: 5, onPageChange: noop },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Current page should have aria-current="page"
    const currentButton = canvas.getByRole('button', { name: 'Page 3' });
    await expect(currentButton).toHaveAttribute('aria-current', 'page');

    // Other pages should not
    const otherButton = canvas.getByRole('button', { name: 'Go to page 2' });
    await expect(otherButton).not.toHaveAttribute('aria-current');
  },
};
