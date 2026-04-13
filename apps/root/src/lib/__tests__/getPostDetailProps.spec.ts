import { getContentBySlug, getContentPagination } from '@/data/contentRegistry';
import { getPostDetailProps } from '../getPostDetailProps';

jest.mock('@/data/contentRegistry');
jest.mock('@/data/contentTypeConfig', () => ({
  contentTypeConfigs: {
    project: {
      basePath: '/projects',
      label: 'Projects',
      contentDir: 'projects',
    },
    blog: { basePath: '/blog', label: 'Blog', contentDir: 'blog' },
    experience: {
      basePath: '/experience',
      label: 'Experience',
      contentDir: 'experience',
    },
  },
}));

const mockGetContentBySlug = getContentBySlug as jest.MockedFunction<
  typeof getContentBySlug
>;
const mockGetContentPagination = getContentPagination as jest.MockedFunction<
  typeof getContentPagination
>;

describe('getPostDetailProps', () => {
  const mockEntry = {
    slug: 'test-project',
    type: 'project' as const,
    thumbnail: {
      title: 'Test Project',
      excerpt: 'A test',
      src: '/photo-123',
      alt: 'test',
    },
    component: () => null,
    metadata: { title: 'Test Project' },
    structuredData: {},
    readingTime: '3 min',
  };

  const mockPagination = {
    prev: { slug: 'prev-project', title: 'Previous' },
    next: { slug: 'next-project', title: 'Next' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when slug does not exist', () => {
    mockGetContentBySlug.mockReturnValue(undefined);
    expect(getPostDetailProps('project', 'nonexistent')).toBeNull();
  });

  it('returns entry, pagination, and breadcrumbs for a valid slug', () => {
    mockGetContentBySlug.mockReturnValue(mockEntry as never);
    mockGetContentPagination.mockReturnValue(mockPagination as never);

    const result = getPostDetailProps('project', 'test-project');

    expect(result).not.toBeNull();
    expect(result!.entry).toBe(mockEntry);
    expect(result!.pagination).toBe(mockPagination);
  });

  it('builds breadcrumbs with correct paths and labels', () => {
    mockGetContentBySlug.mockReturnValue(mockEntry as never);
    mockGetContentPagination.mockReturnValue(mockPagination as never);

    const result = getPostDetailProps('project', 'test-project');

    expect(result!.breadcrumbs).toEqual([
      { href: '/projects', label: 'Projects' },
      { href: '/projects/test-project', label: 'Test Project' },
    ]);
  });

  it('uses the correct content type config', () => {
    mockGetContentBySlug.mockReturnValue(mockEntry as never);
    mockGetContentPagination.mockReturnValue(mockPagination as never);

    getPostDetailProps('blog', 'test-project');

    expect(mockGetContentBySlug).toHaveBeenCalledWith('blog', 'test-project');
    expect(mockGetContentPagination).toHaveBeenCalledWith(
      'blog',
      'test-project'
    );
  });
});
