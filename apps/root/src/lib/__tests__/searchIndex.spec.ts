import { buildSearchIndex, type SearchEntry } from '@/lib/searchIndex';

describe('buildSearchIndex', () => {
  let index: SearchEntry[];

  beforeAll(() => {
    index = buildSearchIndex();
  });

  it('returns a non-empty array', () => {
    expect(index.length).toBeGreaterThan(0);
  });

  it('includes project entries', () => {
    const projects = index.filter(e => e.type === 'project');
    expect(projects.length).toBe(10);
    expect(projects[0].url).toMatch(/^\/projects\//);
  });

  it('includes experience entries', () => {
    const experiences = index.filter(e => e.type === 'experience');
    expect(experiences.length).toBe(5);
    expect(experiences[0].url).toMatch(/^\/experience\//);
  });

  it('includes blog entries', () => {
    const blogs = index.filter(e => e.type === 'blog');
    expect(blogs.length).toBe(19);
    expect(blogs[0].url).toMatch(/^\/blog\//);
  });

  it('includes service entries', () => {
    const services = index.filter(e => e.type === 'service');
    expect(services.length).toBe(4);
    expect(services[0].url).toBe('/services');
  });

  it('includes static page entries', () => {
    const pages = index.filter(e => e.type === 'page');
    expect(pages.length).toBe(4);
    const slugs = pages.map(p => p.slug);
    expect(slugs).toContain('home');
    expect(slugs).toContain('about');
    expect(slugs).toContain('services');
    expect(slugs).toContain('audit');
  });

  it('every entry has required fields', () => {
    for (const entry of index) {
      expect(entry.title).toBeTruthy();
      expect(entry.url).toBeTruthy();
      expect(entry.type).toBeTruthy();
      expect(entry.slug).toBeTruthy();
      expect(Array.isArray(entry.tags)).toBe(true);
    }
  });

  it('total count matches sum of all types', () => {
    // 10 projects + 5 experiences + 19 blogs + 4 services + 4 pages = 42
    expect(index.length).toBe(42);
  });
});
