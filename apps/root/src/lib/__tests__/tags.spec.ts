import {
  getAllTags,
  getContentByTag,
  getTagCounts,
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
