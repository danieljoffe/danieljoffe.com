import { render, screen, within } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ListPagination } from './ListPagination';

expect.extend(toHaveNoViolations);

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
    const current = screen.getByText('2');
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(current.tagName).toBe('SPAN');
  });

  it('renders prev as aria-hidden span on page 1', () => {
    render(<ListPagination currentPage={1} totalPages={3} hrefFor={hrefFor} />);
    // Disabled prev is aria-hidden — no link announced
    expect(
      screen.queryByRole('link', { name: 'Previous page' })
    ).not.toBeInTheDocument();
    // Next is an active link
    const next = screen.getByRole('link', { name: 'Next page' });
    expect(next).toHaveAttribute('href', '/blog/page/2');
  });

  it('renders next as aria-hidden span on the last page', () => {
    render(<ListPagination currentPage={3} totalPages={3} hrefFor={hrefFor} />);
    // Disabled next is aria-hidden — no link announced
    expect(
      screen.queryByRole('link', { name: 'Next page' })
    ).not.toBeInTheDocument();
    // Prev is an active link
    const prev = screen.getByRole('link', { name: 'Previous page' });
    expect(prev).toHaveAttribute('href', '/blog/page/2');
  });

  it('wires prev link to page 1 via hrefFor (which maps to /blog)', () => {
    render(<ListPagination currentPage={2} totalPages={3} hrefFor={hrefFor} />);
    const prev = screen.getByRole('link', { name: 'Previous page' });
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

  it('has no accessibility violations', async () => {
    const { container } = render(
      <ListPagination currentPage={1} totalPages={3} hrefFor={hrefFor} />
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
