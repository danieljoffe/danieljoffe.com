import { redirect } from 'next/navigation';
import { render, screen } from '@testing-library/react';
import { getContentBySlug, getContentSlugs } from '@/data/contentRegistry';
import { getPostDetailProps } from '@/lib/getPostDetailProps';
import SlugBlogPage, {
  generateMetadata,
  generateStaticParams,
} from '../[slug]/page';

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

jest.mock('@/data/contentRegistry');
jest.mock('@/lib/getPostDetailProps');
jest.mock('@/lib/buildPostMetadata', () => ({
  buildPostMetadata: jest.fn((meta: Record<string, unknown>) => ({
    title: meta.title,
  })),
}));

jest.mock('@/components/PostDetailLayout', () => {
  return function MockPostDetailLayout() {
    return <div data-testid='post-detail'>Post Detail</div>;
  };
});

const mockGetContentBySlug = getContentBySlug as jest.MockedFunction<
  typeof getContentBySlug
>;
const mockGetContentSlugs = getContentSlugs as jest.MockedFunction<
  typeof getContentSlugs
>;
const mockGetPostDetailProps = getPostDetailProps as jest.MockedFunction<
  typeof getPostDetailProps
>;

describe('Blog [slug] page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateMetadata', () => {
    it('returns post metadata when entry exists', async () => {
      mockGetContentBySlug.mockReturnValue({
        metadata: { title: 'Test Post' },
      } as never);

      const result = await generateMetadata({
        params: Promise.resolve({ slug: 'test-post' }),
      });

      expect(result).toEqual({ title: 'Test Post' });
    });

    it('returns fallback metadata when entry is missing', async () => {
      mockGetContentBySlug.mockReturnValue(undefined);

      const result = await generateMetadata({
        params: Promise.resolve({ slug: 'nonexistent' }),
      });

      expect(result.title).toContain('Not Found');
    });
  });

  describe('SlugBlogPage', () => {
    it('renders PostDetailLayout when props exist', async () => {
      mockGetPostDetailProps.mockReturnValue({
        entry: {} as never,
        pagination: {} as never,
        breadcrumbs: [],
      });

      const Page = await SlugBlogPage({
        params: Promise.resolve({ slug: 'test-post' }),
      });
      render(Page as React.ReactElement);

      expect(screen.getByTestId('post-detail')).toBeInTheDocument();
    });

    it('redirects when post is not found', async () => {
      mockGetPostDetailProps.mockReturnValue(null);

      await SlugBlogPage({
        params: Promise.resolve({ slug: 'nonexistent' }),
      });

      expect(redirect).toHaveBeenCalled();
    });
  });

  describe('generateStaticParams', () => {
    it('returns slug params for all blog posts', () => {
      mockGetContentSlugs.mockReturnValue(['post-1', 'post-2']);

      const result = generateStaticParams();

      expect(result).toEqual([{ slug: 'post-1' }, { slug: 'post-2' }]);
    });
  });
});
