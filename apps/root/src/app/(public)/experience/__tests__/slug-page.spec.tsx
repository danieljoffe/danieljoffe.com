import { redirect } from 'next/navigation';
import { render, screen } from '@testing-library/react';
import { getContentBySlug, getContentSlugs } from '@/data/contentRegistry';
import { getPostDetailProps } from '@/lib/getPostDetailProps';
import SlugExperiencePage, {
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

describe('Experience [slug] page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateMetadata', () => {
    it('returns post metadata when entry exists', async () => {
      mockGetContentBySlug.mockReturnValue({
        metadata: { title: 'My Job' },
      } as never);

      const result = await generateMetadata({
        params: Promise.resolve({ slug: 'my-job' }),
      });

      expect(result).toEqual({ title: 'My Job' });
    });

    it('returns fallback metadata when entry is missing', async () => {
      mockGetContentBySlug.mockReturnValue(undefined);

      const result = await generateMetadata({
        params: Promise.resolve({ slug: 'nonexistent' }),
      });

      expect(result.title).toContain('Not Found');
    });
  });

  describe('SlugExperiencePage', () => {
    it('renders PostDetailLayout when props exist', async () => {
      mockGetPostDetailProps.mockReturnValue({
        entry: {} as never,
        pagination: {} as never,
        breadcrumbs: [],
      });

      const Page = await SlugExperiencePage({
        params: Promise.resolve({ slug: 'my-job' }),
      });
      render(Page as React.ReactElement);

      expect(screen.getByTestId('post-detail')).toBeInTheDocument();
    });

    it('redirects when experience entry is not found', async () => {
      mockGetPostDetailProps.mockReturnValue(null);

      await SlugExperiencePage({
        params: Promise.resolve({ slug: 'nonexistent' }),
      });

      expect(redirect).toHaveBeenCalled();
    });
  });

  describe('generateStaticParams', () => {
    it('returns slug params for all experience entries', () => {
      mockGetContentSlugs.mockReturnValue(['job-1', 'job-2']);

      const result = generateStaticParams();

      expect(result).toEqual([{ slug: 'job-1' }, { slug: 'job-2' }]);
    });
  });
});
