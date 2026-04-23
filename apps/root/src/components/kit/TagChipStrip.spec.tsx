import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { TagChipStrip } from './TagChipStrip';

expect.extend(toHaveNoViolations);

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

  it('renders buttons instead of links when onTagClick is provided', () => {
    const handleClick = jest.fn();
    render(<TagChipStrip tags={tags} onTagClick={handleClick} />);
    const nav = screen.getByRole('navigation');
    expect(within(nav).queryAllByRole('link')).toHaveLength(0);
    expect(within(nav).getAllByRole('button')).toHaveLength(2);
  });

  it('calls onTagClick with the tag name when a chip is clicked', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();
    render(<TagChipStrip tags={tags} onTagClick={handleClick} />);

    await user.click(screen.getByRole('button', { name: /React/ }));
    expect(handleClick).toHaveBeenCalledWith('React');
  });

  it('marks the active tag with aria-pressed', () => {
    const handleClick = jest.fn();
    render(
      <TagChipStrip tags={tags} onTagClick={handleClick} activeTag='React' />
    );
    expect(screen.getByRole('button', { name: /React/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: /TypeScript/ })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('still renders "View all tags" as a link in interactive mode', () => {
    const handleClick = jest.fn();
    render(
      <TagChipStrip
        tags={tags}
        onTagClick={handleClick}
        viewAllHref='/blog/tags'
      />
    );
    expect(
      screen.getByRole('link', { name: /view all tags/i })
    ).toHaveAttribute('href', '/blog/tags');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<TagChipStrip tags={tags} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
