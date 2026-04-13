import { render, screen } from '@testing-library/react';
import Projects from '../page';

jest.mock('@/data/contentRegistry', () => ({
  getContentByType: jest.fn(() => [
    {
      thumbnail: {
        title: 'Project A',
        slug: 'project-a',
        excerpt: 'Desc A',
        src: '/photo-1',
        alt: 'A',
      },
      readingTime: '3 min',
    },
    {
      thumbnail: {
        title: 'Project B',
        slug: 'project-b',
        excerpt: 'Desc B',
        src: '/photo-2',
        alt: 'B',
      },
      readingTime: '5 min',
    },
  ]),
}));

jest.mock('@/data/metadata/project', () => ({
  projectRootMetadata: { title: 'Projects' },
}));

jest.mock('@/data/structuredData/project', () => ({
  projectsRootStructuredData: {},
}));

jest.mock('@/utils/constants', () => ({
  GITHUB_REPO_URL: 'https://github.com/test',
  STORYBOOK_URL: 'https://storybook.test',
}));

jest.mock('@/lib/layoutStyles', () => ({
  cardBase: 'mock-card-base',
}));

jest.mock('@/components/kit', () => ({
  PostCard: ({ post }: { post: { title: string; slug: string } }) => (
    <div data-testid={`post-card-${post.slug}`}>{post.title}</div>
  ),
}));

describe('Projects page', () => {
  it('renders hero heading', () => {
    render(<Projects />);
    expect(screen.getByText('Case studies from the field')).toBeInTheDocument();
  });

  it('renders project cards', () => {
    render(<Projects />);
    expect(screen.getByTestId('post-card-project-a')).toBeInTheDocument();
    expect(screen.getByTestId('post-card-project-b')).toBeInTheDocument();
  });

  it('renders GitHub and Storybook links', () => {
    render(<Projects />);
    expect(screen.getByRole('link', { name: /github/i })).toHaveAttribute(
      'href',
      'https://github.com/test'
    );
    expect(screen.getByRole('link', { name: /storybook/i })).toHaveAttribute(
      'href',
      'https://storybook.test'
    );
  });
});
