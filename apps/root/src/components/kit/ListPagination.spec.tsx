import { render, screen, within } from '@testing-library/react';
import { ListPagination } from './ListPagination';

// next/link renders a plain <a> with an href in the test environment — jest
// already has the usual Next mocks in place via apps/root/src/test-setup.ts.

const hrefFor = (page: number) => (page === 1 ? '/blog' : `/blog/page/${page}`);

describe('ListPagination', () => {
  it('returns null when there is only one page', () => {
    const { container } = render(
      <ListPagination currentPage={1} totalPages={1} hrefFor={hrefFor} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders numbered links for a small page count', () => {
    render(<ListPagination currentPage={1} totalPages={3} hrefFor={hrefFor} />);
    const nav = screen.getByRole('navigation', { name: 'Pagination' });
    expect(within(nav).getByLabelText('Go to page 2')).toHaveAttribute(
      'href',
      '/blog/page/2'
    );
    expect(within(nav).getByLabelText('Go to page 3')).toHaveAttribute(
      'href',
      '/blog/page/3'
    );
  });

  it('marks the current page with aria-current and renders it as a span', () => {
    render(<ListPagination currentPage={2} totalPages={3} hrefFor={hrefFor} />);
    const current = screen.getByLabelText('Page 2');
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(current.tagName).toBe('SPAN');
  });

  it('renders prev as disabled span on page 1', () => {
    render(<ListPagination currentPage={1} totalPages={3} hrefFor={hrefFor} />);
    const prev = screen.getByLabelText('Previous page');
    expect(prev).toHaveAttribute('aria-disabled', 'true');
    expect(prev.tagName).toBe('SPAN');
    const next = screen.getByLabelText('Next page');
    expect(next.tagName).toBe('A');
    expect(next).toHaveAttribute('href', '/blog/page/2');
  });

  it('renders next as disabled span on the last page', () => {
    render(<ListPagination currentPage={3} totalPages={3} hrefFor={hrefFor} />);
    const next = screen.getByLabelText('Next page');
    expect(next).toHaveAttribute('aria-disabled', 'true');
    expect(next.tagName).toBe('SPAN');
    const prev = screen.getByLabelText('Previous page');
    expect(prev.tagName).toBe('A');
    expect(prev).toHaveAttribute('href', '/blog/page/2');
  });

  it('wires prev link to page 1 via hrefFor (which maps to /blog)', () => {
    render(<ListPagination currentPage={2} totalPages={3} hrefFor={hrefFor} />);
    const prev = screen.getByLabelText('Previous page');
    expect(prev).toHaveAttribute('href', '/blog');
  });

  it('renders an ellipsis when there are more than 7 pages', () => {
    render(
      <ListPagination currentPage={5} totalPages={10} hrefFor={hrefFor} />
    );
    // The middle ellipses render as spans with "..." text
    const nav = screen.getByRole('navigation', { name: 'Pagination' });
    expect(within(nav).getAllByText('...').length).toBeGreaterThanOrEqual(1);
    // First and last pages always present
    expect(within(nav).getByLabelText('Go to page 1')).toBeInTheDocument();
    expect(within(nav).getByLabelText('Go to page 10')).toBeInTheDocument();
  });
});
