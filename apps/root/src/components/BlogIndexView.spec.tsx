import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { BlogIndexView } from './BlogIndexView';

expect.extend(toHaveNoViolations);

jest.mock('@/data/contentRegistry', () => ({
  getContentByType: () => [],
}));

jest.mock('@/lib/pagination', () => ({
  getPaginatedContent: () => ({ items: [], totalPages: 1 }),
}));

jest.mock('@/lib/tags', () => ({
  getTopTags: () => [],
  tagToSlug: (tag: string) => tag.toLowerCase(),
}));

jest.mock('@/data/structuredData/blog', () => ({
  blogRootStructuredData: { '@context': 'https://schema.org', '@type': 'Blog' },
}));

jest.mock('./BlogSearchAndList', () => ({
  BlogSearchAndList: () => <div data-testid='blog-search-and-list' />,
}));

describe('BlogIndexView', () => {
  it('renders hero heading and posts section', () => {
    render(<BlogIndexView currentPage={1} />);
    expect(
      screen.getByRole('heading', { name: /notes from shipping code/i })
    ).toBeInTheDocument();
    expect(screen.getByTestId('blog-search-and-list')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<BlogIndexView currentPage={1} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
