import { render, screen, within } from '@testing-library/react';
import { TagChipStrip } from './TagChipStrip';

const tags = [
  { name: 'React', count: 5, href: '/blog/tags/react' },
  { name: 'TypeScript', count: 3, href: '/blog/tags/typescript' },
];

describe('TagChipStrip', () => {
  it('returns null when the tag list is empty', () => {
    const { container } = render(<TagChipStrip tags={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders each tag as a link with its count', () => {
    render(<TagChipStrip tags={tags} />);
    const nav = screen.getByRole('navigation', { name: 'Filter by tag' });
    const reactLink = within(nav).getByRole('link', { name: /React/ });
    expect(reactLink).toHaveAttribute('href', '/blog/tags/react');
    expect(reactLink).toHaveTextContent('React');
    expect(reactLink).toHaveTextContent('(5)');

    const tsLink = within(nav).getByRole('link', { name: /TypeScript/ });
    expect(tsLink).toHaveAttribute('href', '/blog/tags/typescript');
    expect(tsLink).toHaveTextContent('(3)');
  });

  it('renders a "View all tags" link when viewAllHref is provided', () => {
    render(<TagChipStrip tags={tags} viewAllHref='/blog/tags' />);
    const viewAll = screen.getByRole('link', { name: /view all tags/i });
    expect(viewAll).toHaveAttribute('href', '/blog/tags');
  });

  it('omits the view-all link when viewAllHref is not provided', () => {
    render(<TagChipStrip tags={tags} />);
    expect(
      screen.queryByRole('link', { name: /view all tags/i })
    ).not.toBeInTheDocument();
  });

  it('uses a custom aria-label when provided', () => {
    render(<TagChipStrip tags={tags} ariaLabel='Filter projects by tag' />);
    expect(
      screen.getByRole('navigation', { name: 'Filter projects by tag' })
    ).toBeInTheDocument();
  });
});
