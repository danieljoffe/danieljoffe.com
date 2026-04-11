import { paginate, getPaginatedContent, getTotalPages } from '../pagination';

jest.mock('@/data/contentRegistry', () => {
  const fakeEntries = Array.from({ length: 25 }, (_, i) => ({
    slug: `post-${i + 1}`,
    type: 'blog',
    thumbnail: { title: `Post ${i + 1}` },
    metadata: {},
    structuredData: {},
    readingTime: 5,
  }));
  return {
    getContentByType: jest.fn((type: string) =>
      type === 'blog' ? fakeEntries : []
    ),
  };
});

describe('paginate', () => {
  const items = Array.from({ length: 10 }, (_, i) => i + 1);

  it('returns the first page slice with correct metadata', () => {
    const result = paginate(items, 3, 1);
    expect(result.items).toEqual([1, 2, 3]);
    expect(result.currentPage).toBe(1);
    expect(result.totalPages).toBe(4);
    expect(result.hasPrev).toBe(false);
    expect(result.hasNext).toBe(true);
  });

  it('returns a middle page slice with prev+next', () => {
    const result = paginate(items, 3, 2);
    expect(result.items).toEqual([4, 5, 6]);
    expect(result.hasPrev).toBe(true);
    expect(result.hasNext).toBe(true);
  });

  it('returns the last (partial) page with hasNext=false', () => {
    const result = paginate(items, 3, 4);
    expect(result.items).toEqual([10]);
    expect(result.hasPrev).toBe(true);
    expect(result.hasNext).toBe(false);
  });

  it('clamps an out-of-range pageNumber to the last valid page', () => {
    const result = paginate(items, 3, 99);
    expect(result.currentPage).toBe(4);
    expect(result.items).toEqual([10]);
  });

  it('clamps pageNumber < 1 to page 1', () => {
    const result = paginate(items, 3, 0);
    expect(result.currentPage).toBe(1);
    expect(result.items).toEqual([1, 2, 3]);
  });

  it('handles an empty list with totalPages=1 and no items', () => {
    const result = paginate([], 5, 1);
    expect(result.items).toEqual([]);
    expect(result.totalPages).toBe(1);
    expect(result.currentPage).toBe(1);
    expect(result.hasPrev).toBe(false);
    expect(result.hasNext).toBe(false);
  });

  it('coerces pageSize < 1 to 1 to avoid divide-by-zero', () => {
    const result = paginate(items, 0, 1);
    expect(result.items).toEqual([1]);
    expect(result.totalPages).toBe(10);
  });
});

describe('getPaginatedContent', () => {
  it('paginates content from the registry in newest-first order', () => {
    const result = getPaginatedContent('blog', 1, 10);
    expect(result.items).toHaveLength(10);
    expect(result.totalPages).toBe(3);
    // Registry mock returns posts 1..25 ordered ascending; reversed first
    // entry should be post-25
    expect(result.items[0].slug).toBe('post-25');
  });

  it('returns the final page slice for page 3', () => {
    const result = getPaginatedContent('blog', 3, 10);
    expect(result.items).toHaveLength(5);
    expect(result.hasNext).toBe(false);
    expect(result.currentPage).toBe(3);
  });

  it('returns an empty paginated result for an empty content type', () => {
    const result = getPaginatedContent('experience', 1, 10);
    expect(result.items).toEqual([]);
    expect(result.totalPages).toBe(1);
  });
});

describe('getTotalPages', () => {
  it('returns ceil(count / pageSize)', () => {
    expect(getTotalPages('blog', 10)).toBe(3);
    expect(getTotalPages('blog', 12)).toBe(3);
    expect(getTotalPages('blog', 25)).toBe(1);
  });

  it('returns 1 for an empty content type', () => {
    expect(getTotalPages('experience', 10)).toBe(1);
  });
});
