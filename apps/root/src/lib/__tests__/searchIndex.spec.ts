import { buildSearchIndex } from '../searchIndex';

describe('buildSearchIndex', () => {
  it('returns an array', () => {
    const index = buildSearchIndex();
    expect(Array.isArray(index)).toBe(true);
  });

  it('includes content entries from generated index', () => {
    const index = buildSearchIndex();
    // Based on your earlier output showing 43 entries
    expect(index.length).toBeGreaterThanOrEqual(43);
  });

  it('each entry has required fields', () => {
    const index = buildSearchIndex();
    const firstEntry = index[0];

    expect(firstEntry).toHaveProperty('id');
    expect(firstEntry).toHaveProperty('title');
    expect(firstEntry).toHaveProperty('excerpt');
    expect(firstEntry).toHaveProperty('tags');
    expect(firstEntry).toHaveProperty('type');
    expect(firstEntry).toHaveProperty('slug');
    expect(firstEntry).toHaveProperty('url');
    expect(firstEntry).toHaveProperty('body');
  });

  it('includes static page entries', () => {
    const index = buildSearchIndex();
    const pages = index.filter(e => e.type === 'page');
    expect(pages.length).toBe(3);
    const slugs = pages.map(p => p.slug);
    expect(slugs).toContain('about');
    expect(slugs).toContain('services');
    expect(slugs).toContain('audit');
  });

  it('has body text for content entries', () => {
    const index = buildSearchIndex();
    const contentEntries = index.filter(e =>
      ['blog', 'project', 'experience'].includes(e.type)
    );

    if (contentEntries.length > 0) {
      const entriesWithBody = contentEntries.filter(
        e => e.body && e.body.length > 0
      );
      expect(entriesWithBody.length).toBeGreaterThan(0);
    }
  });
});
