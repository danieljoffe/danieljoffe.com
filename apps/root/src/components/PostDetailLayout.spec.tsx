import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import type { PostDetailProps } from '@/lib/getPostDetailProps';
import PostDetailLayout from './PostDetailLayout';

expect.extend(toHaveNoViolations);

jest.mock('@/components/PostBody', () => ({
  __esModule: true,
  default: ({
    children,
    title,
  }: {
    children: React.ReactNode;
    title: string;
  }) => (
    <div data-testid='post-body'>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

jest.mock('@/components/kit', () => ({
  PostPagination: () => <nav aria-label='Post pagination' />,
}));

function makeProps(): PostDetailProps {
  return {
    entry: {
      slug: 'test-post',
      type: 'blog',
      component: () => <p>Body content</p>,
      metadata: {
        title: 'Test Post',
        date: '2026-01-01',
        excerpt: 'Excerpt',
        author: 'Daniel Joffe',
        category: 'Frontend Engineering',
        tags: ['React'],
        slug: 'test-post',
        type: 'blog',
      },
      thumbnail: {
        title: 'Test Post',
        excerpt: 'Excerpt',
        href: '/blog/test-post',
        date: '2026-01-01',
        tags: ['React'],
        cover: {
          alt: 'Cover',
          src: '/photo-1',
          origin: 'https://unsplash.com/x',
          creator: '@x',
        },
      },
      structuredData: { '@context': 'https://schema.org', '@type': 'Article' },
      readingTime: 3,
    },
    pagination: { prev: null, next: null },
    breadcrumbs: [{ label: 'Blog', href: '/blog' }],
  } as unknown as PostDetailProps;
}

describe('PostDetailLayout', () => {
  it('renders the post body with the article content', () => {
    render(<PostDetailLayout {...makeProps()} />);
    expect(screen.getByTestId('post-body')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Test Post' })
    ).toBeInTheDocument();
    expect(screen.getByText('Body content')).toBeInTheDocument();
  });

  it('injects structured data JSON-LD', () => {
    const { container } = render(<PostDetailLayout {...makeProps()} />);
    const script = container.querySelector(
      'script[type="application/ld+json"]'
    );
    expect(script?.textContent).toContain('"@type":"Article"');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<PostDetailLayout {...makeProps()} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
