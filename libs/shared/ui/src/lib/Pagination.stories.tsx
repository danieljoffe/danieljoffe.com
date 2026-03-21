import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Pagination } from './Pagination';

const meta = {
  title: 'Navigation/Pagination',
  component: Pagination,
  tags: ['autodocs'],
} satisfies Meta<typeof Pagination>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { currentPage: 1, totalPages: 10 },
};

export const MiddlePage: Story = {
  args: { currentPage: 5, totalPages: 10 },
};

export const FewPages: Story = {
  args: { currentPage: 2, totalPages: 3 },
};

export const ManyPages: Story = {
  args: { currentPage: 10, totalPages: 50 },
};

export const Interactive: Story = {
  render: () => {
    const [page, setPage] = useState(1);
    return (
      <Pagination currentPage={page} totalPages={20} onPageChange={setPage} />
    );
  },
};
