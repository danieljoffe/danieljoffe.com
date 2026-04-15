import { render, screen } from '@testing-library/react';
import type { PostPaginationData } from '@/data/contentOrder';
import { PostPagination } from './PostPagination';

const pagination: PostPaginationData = {
  prev: {
    slug: 'previous-post',
    title: 'Previous Post',
    href: '/blog/previous-post',
  },
  next: { slug: 'next-post', title: 'Next Post', href: '/blog/next-post' },
};

describe('PostPagination', () => {
  it('renders a nav landmark labelled for post navigation', () => {
    render(<PostPagination pagination={pagination} />);
    expect(
      screen.getByRole('navigation', { name: 'Post navigation' })
    ).toBeInTheDocument();
  });

  it('renders the prev link with its href and accessible label', () => {
    render(<PostPagination pagination={pagination} />);
    const prev = screen.getByRole('link', { name: /previous: previous post/i });
    expect(prev).toHaveAttribute('href', '/blog/previous-post');
    expect(prev).toHaveTextContent('Previous Post');
  });

  it('renders the next link with its href and accessible label', () => {
    render(<PostPagination pagination={pagination} />);
    const next = screen.getByRole('link', { name: /next: next post/i });
    expect(next).toHaveAttribute('href', '/blog/next-post');
    expect(next).toHaveTextContent('Next Post');
  });
});
