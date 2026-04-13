import {
  getAllTags,
  getContentByTag,
  getTagCounts,
  getTopTags,
  tagToSlug,
  slugToTag,
} from '../tags';
// import { buildSearchIndex } from '../searchIndex';

// Mock the search index to avoid generating it during tests
jest.mock('../searchIndex', () => ({
  buildSearchIndex: jest.fn(() => [
    {
      id: 'blog:test-1',
      title: 'Test Post 1',
      excerpt: 'Test excerpt',
      tags: ['react', 'javascript'],
      type: 'blog',
      slug: 'test-1',
      url: '/blog/test-1',
      body: 'Content here',
      category: 'tutorial',
    },
    {
      id: 'blog:test-2',
      title: 'Test Post 2',
      excerpt: 'Another test',
      tags: ['react', 'typescript'],
      type: 'blog',
      slug: 'test-2',
      url: '/blog/test-2',
      body: 'More content',
      category: 'tutorial',
    },
    {
      id: 'project:test-3',
      title: 'Test Project',
      excerpt: 'Project description',
      tags: ['react', 'nextjs'],
      type: 'project',
      slug: 'test-3',
      url: '/projects/test-3',
      body: 'Project content',
      category: 'development',
    },
  ]),
}));

describe('Tags Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllTags', () => {
    it('returns sorted, deduplicated tags', () => {
      const tags = getAllTags();
      expect(tags).toEqual(['javascript', 'nextjs', 'react', 'typescript']);
    });
  });

  describe('getContentByTag', () => {
    it('returns entries with the given tag', () => {
      const reactContent = getContentByTag('react');
      expect(reactContent.length).toBe(3);
      expect(reactContent[0].title).toBe('Test Post 1');
    });

    it('returns empty array for non-existent tag', () => {
      const nonExistent = getContentByTag('nonexistent');
      expect(nonExistent).toEqual([]);
    });
  });

  describe('getTagCounts', () => {
    it('returns correct counts for each tag', () => {
      const counts = getTagCounts();
      expect(counts.get('react')).toBe(3);
      expect(counts.get('javascript')).toBe(1);
      expect(counts.get('typescript')).toBe(1);
      expect(counts.get('nextjs')).toBe(1);
    });
  });

  describe('type-scoped variants', () => {
    it('getAllTags scoped to blog excludes project-only tags', () => {
      const tags = getAllTags('blog');
      expect(tags).toEqual(['javascript', 'react', 'typescript']);
      expect(tags).not.toContain('nextjs');
    });

    it('getAllTags scoped to project returns only project tags', () => {
      const tags = getAllTags('project');
      expect(tags).toEqual(['nextjs', 'react']);
    });

    it('getContentByTag scoped to blog filters out project entries', () => {
      const results = getContentByTag('react', 'blog');
      expect(results).toHaveLength(2);
      expect(results.every(r => r.type === 'blog')).toBe(true);
    });

    it('getContentByTag scoped to project returns project entries only', () => {
      const results = getContentByTag('react', 'project');
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('project');
    });

    it('getTagCounts scoped to blog excludes project contributions', () => {
      const counts = getTagCounts('blog');
      expect(counts.get('react')).toBe(2);
      expect(counts.get('nextjs')).toBeUndefined();
    });
  });

  describe('getTopTags', () => {
    it('returns blog tags sorted by count desc with alphabetical tie-break', () => {
      const top = getTopTags('blog', 5);
      expect(top).toEqual([
        { name: 'react', count: 2 },
        { name: 'javascript', count: 1 },
        { name: 'typescript', count: 1 },
      ]);
    });

    it('respects the limit argument', () => {
      const top = getTopTags('blog', 1);
      expect(top).toHaveLength(1);
      expect(top[0].name).toBe('react');
    });

    it('returns an empty array when limit is 0 or negative', () => {
      expect(getTopTags('blog', 0)).toEqual([]);
      expect(getTopTags('blog', -5)).toEqual([]);
    });

    it('returns project-only tags when scoped to project', () => {
      const top = getTopTags('project', 5);
      expect(top).toEqual([
        { name: 'nextjs', count: 1 },
        { name: 'react', count: 1 },
      ]);
    });
  });

  describe('tagToSlug and slugToTag', () => {
    const allTags = ['react', 'javascript', 'nextjs', 'typescript'];

    it('converts tag to URL-safe slug', () => {
      expect(tagToSlug('React Framework')).toBe('react-framework');
      expect(tagToSlug('TypeScript 101')).toBe('typescript-101');
    });

    it('converts slug back to original tag', () => {
      const slug = tagToSlug('react');
      expect(slugToTag(slug, allTags)).toBe('react');
    });

    it('returns undefined for invalid slug', () => {
      expect(slugToTag('invalid-slug', allTags)).toBeUndefined();
    });
  });
});
