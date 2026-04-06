import {
  getContentByType,
  getContentBySlug,
  getContentSlugs,
  getContentPagination,
  getContentReadingTime,
  getAllContent,
  type ContentEntry,
} from '@/data/contentRegistry';

describe('contentRegistry', () => {
  describe('getContentByType', () => {
    it('returns all project entries in order', () => {
      const projects = getContentByType('project');
      expect(projects.length).toBe(10);
      expect(projects[0].type).toBe('project');
      expect(projects[0].slug).toBe('ui-components-v1');
    });

    it('returns all experience entries in order', () => {
      const experiences = getContentByType('experience');
      expect(experiences.length).toBe(5);
      expect(experiences[0].type).toBe('experience');
      expect(experiences[0].slug).toBe('winc');
    });

    it('returns all blog entries in order', () => {
      const blogs = getContentByType('blog');
      expect(blogs.length).toBe(16);
      expect(blogs[0].type).toBe('blog');
      expect(blogs[0].slug).toBe('unified-content-pipeline');
      expect(blogs[1].slug).toBe('auto-generated-toc-scroll-spy');
      expect(blogs[2].slug).toBe('visual-regression-ci-pipeline');
      expect(blogs[3].slug).toBe('shared-ui-design-system');
      expect(blogs[4].slug).toBe('compose-providers-react-context');
    });
  });

  describe('getContentBySlug', () => {
    it('returns the correct project entry', () => {
      const entry = getContentBySlug('project', 'ui-components-v1');
      expect(entry).toBeDefined();
      const project = entry as ContentEntry;
      expect(project.slug).toBe('ui-components-v1');
      expect(project.type).toBe('project');
      expect(project.thumbnail).toBeDefined();
      expect(project.structuredData).toBeDefined();
      expect(project.readingTime).toBeGreaterThan(0);
    });

    it('returns the correct experience entry', () => {
      const entry = getContentBySlug('experience', 'winc');
      expect(entry).toBeDefined();
      const experience = entry as ContentEntry;
      expect(experience.slug).toBe('winc');
      expect(experience.type).toBe('experience');
    });

    it('returns undefined for non-existent slug', () => {
      const entry = getContentBySlug('project', 'non-existent');
      expect(entry).toBeUndefined();
    });

    it('returns undefined for wrong type', () => {
      const entry = getContentBySlug('experience', 'ui-components-v1');
      expect(entry).toBeUndefined();
    });
  });

  describe('getContentSlugs', () => {
    it('returns project slugs', () => {
      const slugs = getContentSlugs('project');
      expect(slugs).toContain('ui-components-v1');
      expect(slugs).toContain('ui-components-v2');
      expect(slugs.length).toBe(10);
    });

    it('returns experience slugs', () => {
      const slugs = getContentSlugs('experience');
      expect(slugs).toContain('winc');
      expect(slugs).toContain('fightcamp');
      expect(slugs.length).toBe(5);
    });

    it('returns blog slugs', () => {
      const slugs = getContentSlugs('blog');
      expect(slugs).toContain('unified-content-pipeline');
      expect(slugs).toContain('auto-generated-toc-scroll-spy');
      expect(slugs).toContain('visual-regression-ci-pipeline');
      expect(slugs).toContain('shared-ui-design-system');
      expect(slugs).toContain('compose-providers-react-context');
      expect(slugs).toContain('typography-system-nextjs');
      expect(slugs).toContain('removing-focus-trap-react');
      expect(slugs).toContain('eslint-import-ordering-monorepo');
      expect(slugs).toContain('rule-of-three-design-systems');
      expect(slugs).toContain('documenting-design-tokens');
      expect(slugs).toContain('accessible-dropdown-keyboard-nav');
      expect(slugs).toContain('toast-pause-on-hover');
      expect(slugs).toContain('keyboard-navigable-data-tables');
      expect(slugs.length).toBe(16);
    });
  });

  describe('getContentPagination', () => {
    it('returns circular pagination for first project', () => {
      const pagination = getContentPagination('project', 'ui-components-v1');
      expect(pagination.prev.slug).toBe('appcontext-simplification-case-study'); // wraps to last
      expect(pagination.next.slug).toBe('cms-tooling-case-study'); // second project
    });

    it('returns circular pagination for last project', () => {
      const pagination = getContentPagination(
        'project',
        'appcontext-simplification-case-study'
      );
      expect(pagination.next.slug).toBe('ui-components-v1'); // wraps to first
    });

    it('includes title and href in pagination links', () => {
      const pagination = getContentPagination('project', 'ui-components-v1');
      expect(pagination.next.title).toBeDefined();
      expect(pagination.next.href).toMatch(/^\/projects\//);
      expect(pagination.prev.href).toMatch(/^\/projects\//);
    });

    it('returns correct pagination for experience', () => {
      const pagination = getContentPagination('experience', 'winc');
      expect(pagination.next.slug).toBe('internet-brands');
      expect(pagination.next.href).toMatch(/^\/experience\//);
    });
  });

  describe('getContentReadingTime', () => {
    it('returns a positive reading time for existing entry', () => {
      const time = getContentReadingTime('project', 'ui-components-v1');
      expect(time).toBeGreaterThan(0);
    });

    it('returns 0 for non-existent entry', () => {
      const time = getContentReadingTime('project', 'non-existent');
      expect(time).toBe(0);
    });
  });

  describe('getAllContent', () => {
    it('returns all entries (projects + experience)', () => {
      const all = getAllContent();
      expect(all.length).toBe(31); // 10 projects + 5 experiences + 16 blogs
    });

    it('contains entries of all types', () => {
      const all = getAllContent();
      const types = new Set(all.map(e => e.type));
      expect(types.has('project')).toBe(true);
      expect(types.has('experience')).toBe(true);
      expect(types.has('blog')).toBe(true);
    });
  });
});
