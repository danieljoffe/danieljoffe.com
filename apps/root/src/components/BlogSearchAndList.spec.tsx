import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PostThumbnail } from '@/types/postTypes';
import { BlogSearchAndList } from './BlogSearchAndList';

jest.mock('@/lib/searchIndex', () => ({
  buildSearchIndex: () => [
    {
      id: 'blog:react-server-components',
      title: 'React Server Components',
      excerpt: 'Notes on RSC and streaming',
      tags: ['react', 'ssr'],
      category: 'React',
      type: 'blog',
      slug: 'react-server-components',
      url: '/blog/react-server-components',
      body: 'Long body about React and streaming',
      date: null,
      author: null,
    },
    {
      id: 'blog:tailwind-theme',
      title: 'Tailwind Theme Tokens',
      excerpt: 'Design tokens in CSS',
      tags: ['tailwind', 'css'],
      category: 'CSS',
      type: 'blog',
      slug: 'tailwind-theme',
      url: '/blog/tailwind-theme',
      body: 'Tailwind 4 theme directive explained',
      date: null,
      author: null,
    },
    {
      id: 'project:noise',
      title: 'Noisy project',
      excerpt: 'should never appear in blog search',
      tags: ['react'],
      category: 'Project',
      type: 'project',
      slug: 'noise',
      url: '/projects/noise',
      body: '',
      date: null,
      author: null,
    },
  ],
}));

function makePost(slug: string, title: string): PostThumbnail {
  return {
    slug,
    title,
    description: `${title} description`,
    cover: {
      src: `/img/${slug}.jpg`,
      alt: title,
      origin: 'https://unsplash.com',
      creator: '@test',
    },
    link: { href: `/blog/${slug}` },
    readingTime: 5,
  };
}

const rsc = makePost('react-server-components', 'React Server Components');
const tw = makePost('tailwind-theme', 'Tailwind Theme Tokens');
const allPosts = [rsc, tw];

describe('BlogSearchAndList', () => {
  it('renders the pagination control and paginated grid when the query is empty', () => {
    render(
      <BlogSearchAndList
        pagePosts={[rsc]}
        allPosts={allPosts}
        currentPage={1}
        totalPages={2}
        basePath='/blog'
      />
    );
    expect(
      screen.getByRole('navigation', { name: 'Pagination' })
    ).toBeInTheDocument();
    expect(screen.getByText('React Server Components')).toBeInTheDocument();
    expect(screen.queryByText('Tailwind Theme Tokens')).not.toBeInTheDocument();
  });

  it('filters posts by query and hides pagination while searching', async () => {
    const user = userEvent.setup();
    render(
      <BlogSearchAndList
        pagePosts={[rsc]}
        allPosts={allPosts}
        currentPage={1}
        totalPages={2}
        basePath='/blog'
      />
    );

    const input = screen.getByLabelText('Search blog posts');
    await user.type(input, 'tailwind');

    // Pagination hidden
    expect(
      screen.queryByRole('navigation', { name: 'Pagination' })
    ).not.toBeInTheDocument();
    // Result present
    expect(screen.getByText('Tailwind Theme Tokens')).toBeInTheDocument();
    // Previous page post not shown (outside the match)
    expect(
      screen.queryByText('React Server Components')
    ).not.toBeInTheDocument();
    // Result count announcement
    expect(screen.getByText(/result/i)).toBeInTheDocument();
  });

  it('shows empty-state text when no results match the query', async () => {
    const user = userEvent.setup();
    render(
      <BlogSearchAndList
        pagePosts={[rsc]}
        allPosts={allPosts}
        currentPage={1}
        totalPages={2}
        basePath='/blog'
      />
    );

    const input = screen.getByLabelText('Search blog posts');
    await user.type(input, 'zzzzzzzzz');

    expect(screen.getByText(/no posts match your search/i)).toBeInTheDocument();
  });

  it('returns pagination + grid when the query is cleared', async () => {
    const user = userEvent.setup();
    render(
      <BlogSearchAndList
        pagePosts={[rsc]}
        allPosts={allPosts}
        currentPage={1}
        totalPages={2}
        basePath='/blog'
      />
    );

    const input = screen.getByLabelText('Search blog posts');
    await user.type(input, 'tailwind');
    await user.clear(input);

    const nav = await screen.findByRole('navigation', { name: 'Pagination' });
    expect(within(nav).getByLabelText('Go to page 2')).toHaveAttribute(
      'href',
      '/blog/page/2'
    );
  });
});
