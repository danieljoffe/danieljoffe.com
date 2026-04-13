import sitemap from '../sitemap';

jest.mock('@/utils/constants', () => ({
  DOMAIN_URL: 'https://danieljoffe.com',
  ABOUT_LINK: { href: '/about' },
  AUDIT_LINK: { href: '/audit' },
  BLOG_LINK: { href: '/blog' },
  EXPERIENCE_LINK: { href: '/experience' },
  PROJECTS_LINK: { href: '/projects' },
  SERVICES_LINK: { href: '/services' },
}));

jest.mock('@/data/experience', () => ({
  experiencePageSlugs: ['job-one', 'job-two'],
}));

jest.mock('@/data/project', () => ({
  projectPageSlugs: ['project-alpha'],
}));

jest.mock('@/data/blog', () => ({
  blogPageSlugs: ['post-one', 'post-two', 'post-three'],
}));

describe('sitemap', () => {
  it('returns an array of sitemap entries', () => {
    const result = sitemap();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('includes all static routes', () => {
    const result = sitemap();
    const urls = result.map(entry => entry.url);

    expect(urls).toContain('https://danieljoffe.com');
    expect(urls).toContain('https://danieljoffe.com/about');
    expect(urls).toContain('https://danieljoffe.com/services');
    expect(urls).toContain('https://danieljoffe.com/projects');
    expect(urls).toContain('https://danieljoffe.com/experience');
    expect(urls).toContain('https://danieljoffe.com/blog');
    expect(urls).toContain('https://danieljoffe.com/audit');
  });

  it('includes dynamic experience routes', () => {
    const result = sitemap();
    const urls = result.map(entry => entry.url);

    expect(urls).toContain('https://danieljoffe.com/experience/job-one');
    expect(urls).toContain('https://danieljoffe.com/experience/job-two');
  });

  it('includes dynamic project routes', () => {
    const result = sitemap();
    const urls = result.map(entry => entry.url);

    expect(urls).toContain('https://danieljoffe.com/projects/project-alpha');
  });

  it('includes dynamic blog routes', () => {
    const result = sitemap();
    const urls = result.map(entry => entry.url);

    expect(urls).toContain('https://danieljoffe.com/blog/post-one');
    expect(urls).toContain('https://danieljoffe.com/blog/post-two');
    expect(urls).toContain('https://danieljoffe.com/blog/post-three');
  });

  it('assigns correct priorities', () => {
    const result = sitemap();
    const home = result.find(e => e.url === 'https://danieljoffe.com');
    const project = result.find(
      e => e.url === 'https://danieljoffe.com/projects/project-alpha'
    );
    const experience = result.find(
      e => e.url === 'https://danieljoffe.com/experience/job-one'
    );

    expect(home!.priority).toBe(1);
    expect(project!.priority).toBe(0.7);
    expect(experience!.priority).toBe(0.6);
  });

  it('sets lastModified on all entries', () => {
    const result = sitemap();
    result.forEach(entry => {
      expect(entry.lastModified).toBeInstanceOf(Date);
    });
  });
});
