jest.mock('@/data/generated/searchIndex.json', () => [
  {
    id: 'blog:test-post',
    slug: 'test-post',
    type: 'blog',
    title: 'Test Post',
    excerpt: 'A test blog post',
    tags: ['React', 'TypeScript'],
    category: 'tutorial',
    body: 'Test body content for search indexing.',
    url: '/blog/test-post',
    date: '2025-01-01',
    author: 'Daniel Joffe',
  },
  {
    id: 'project:test-project',
    slug: 'test-project',
    type: 'project',
    title: 'Test Project',
    excerpt: 'A test project',
    tags: ['Next.js', 'Performance'],
    category: 'development',
    body: 'Project body content.',
    url: '/projects/test-project',
    date: '2025-02-01',
    author: 'Daniel Joffe',
  },
]);

import { buildSearchIndex } from '../searchIndex';

describe('buildSearchIndex', () => {
  it('returns an array', () => {
    const index = buildSearchIndex();
    expect(Array.isArray(index)).toBe(true);
  });

  it('includes generated entries and static page entries', () => {
    const index = buildSearchIndex();
    // 2 generated + 3 static pages
    expect(index).toHaveLength(5);
  });

  it('each entry has required fields', () => {
    const index = buildSearchIndex();

    for (const entry of index) {
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('title');
      expect(entry).toHaveProperty('excerpt');
      expect(entry).toHaveProperty('tags');
      expect(entry).toHaveProperty('type');
      expect(entry).toHaveProperty('slug');
      expect(entry).toHaveProperty('url');
      expect(entry).toHaveProperty('body');
    }
  });

  it('includes static page entries for about, services, and audit', () => {
    const index = buildSearchIndex();
    const pages = index.filter(e => e.type === 'page');
    expect(pages).toHaveLength(3);

    const slugs = pages.map(p => p.slug);
    expect(slugs).toContain('about');
    expect(slugs).toContain('services');
    expect(slugs).toContain('audit');
  });

  it('has body text for generated content entries', () => {
    const index = buildSearchIndex();
    const contentEntries = index.filter(e =>
      ['blog', 'project', 'experience'].includes(e.type)
    );

    expect(contentEntries.length).toBeGreaterThan(0);
    for (const entry of contentEntries) {
      expect(entry.body.length).toBeGreaterThan(0);
    }
  });
});
