import { rootMetadata } from '../metadata/root';
import { aboutMetadata } from '../metadata/about';
import { homeMetadata } from '../metadata/home';
import { servicesMetadata } from '../metadata/services';
import { notFoundMetadata } from '../metadata/notFound';
import { projectRootMetadata } from '../metadata/project';
import { experienceRootMetadata } from '../metadata/experience';
import { buildPostMetadata } from '@/lib/buildPostMetadata';
import { PostMetadata } from '@/types/postTypes';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extracts a plain title string regardless of whether title is a string or { default } object. */
function titleToString(title: unknown): string | undefined {
  if (typeof title === 'string') return title;
  if (title && typeof title === 'object' && 'default' in title) {
    return (title as { default: string }).default;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// root.ts
// ---------------------------------------------------------------------------

describe('metadata/root', () => {
  it('is defined and is an object', () => {
    expect(rootMetadata).toBeDefined();
    expect(typeof rootMetadata).toBe('object');
  });

  it('has a title', () => {
    expect(titleToString(rootMetadata.title)).toEqual(expect.any(String));
  });

  it('has a description string', () => {
    expect(typeof rootMetadata.description).toBe('string');
  });

  it('has icons field', () => {
    expect(rootMetadata.icons).toBeDefined();
    expect(typeof rootMetadata.icons).toBe('object');
  });

  it('has openGraph field', () => {
    expect(rootMetadata.openGraph).toBeDefined();
    expect(typeof rootMetadata.openGraph).toBe('object');
  });

  it('has twitter field', () => {
    expect(rootMetadata.twitter).toBeDefined();
    expect(typeof rootMetadata.twitter).toBe('object');
  });
});

// ---------------------------------------------------------------------------
// about.ts
// ---------------------------------------------------------------------------

describe('metadata/about', () => {
  it('is defined and is an object', () => {
    expect(aboutMetadata).toBeDefined();
    expect(typeof aboutMetadata).toBe('object');
  });

  it('has title as a string', () => {
    expect(typeof aboutMetadata.title).toBe('string');
  });

  it('has description as a string', () => {
    expect(typeof aboutMetadata.description).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// home.ts
// ---------------------------------------------------------------------------

describe('metadata/home', () => {
  it('is defined and is an object', () => {
    expect(homeMetadata).toBeDefined();
    expect(typeof homeMetadata).toBe('object');
  });

  it('has title as a string', () => {
    expect(typeof homeMetadata.title).toBe('string');
  });

  it('has description as a string', () => {
    expect(typeof homeMetadata.description).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// services.ts
// ---------------------------------------------------------------------------

describe('metadata/services', () => {
  it('is defined and is an object', () => {
    expect(servicesMetadata).toBeDefined();
    expect(typeof servicesMetadata).toBe('object');
  });

  it('has title as a string', () => {
    expect(typeof servicesMetadata.title).toBe('string');
  });

  it('has description as a string', () => {
    expect(typeof servicesMetadata.description).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// notFound.ts
// ---------------------------------------------------------------------------

describe('metadata/notFound', () => {
  it('is defined and is an object', () => {
    expect(notFoundMetadata).toBeDefined();
    expect(typeof notFoundMetadata).toBe('object');
  });

  it('has title as a string', () => {
    expect(typeof notFoundMetadata.title).toBe('string');
  });

  it('has description as a string', () => {
    expect(typeof notFoundMetadata.description).toBe('string');
  });

  it('has robots field with noindex', () => {
    expect(notFoundMetadata.robots).toBeDefined();
    expect(notFoundMetadata.robots).toEqual(
      expect.objectContaining({ index: false })
    );
  });
});

// ---------------------------------------------------------------------------
// project.ts
// ---------------------------------------------------------------------------

describe('metadata/project', () => {
  describe('projectRootMetadata', () => {
    it('is defined and is an object', () => {
      expect(projectRootMetadata).toBeDefined();
      expect(typeof projectRootMetadata).toBe('object');
    });

    it('has title as a string', () => {
      expect(typeof projectRootMetadata.title).toBe('string');
    });

    it('has description as a string', () => {
      expect(typeof projectRootMetadata.description).toBe('string');
    });

    it('has keywords array', () => {
      expect(Array.isArray(projectRootMetadata.keywords)).toBe(true);
    });

    it('has alternates with canonical', () => {
      expect(projectRootMetadata.alternates).toBeDefined();
      expect(
        (projectRootMetadata.alternates as { canonical: string }).canonical
      ).toBeDefined();
    });

    it('has openGraph field', () => {
      expect(projectRootMetadata.openGraph).toBeDefined();
      expect(typeof projectRootMetadata.openGraph).toBe('object');
    });

    it('has twitter field', () => {
      expect(projectRootMetadata.twitter).toBeDefined();
      expect(typeof projectRootMetadata.twitter).toBe('object');
    });
  });
});

// ---------------------------------------------------------------------------
// experience.ts
// ---------------------------------------------------------------------------

describe('metadata/experience', () => {
  describe('experienceRootMetadata', () => {
    it('is defined and is an object', () => {
      expect(experienceRootMetadata).toBeDefined();
      expect(typeof experienceRootMetadata).toBe('object');
    });

    it('has title as a string', () => {
      expect(typeof experienceRootMetadata.title).toBe('string');
    });

    it('has description as a string', () => {
      expect(typeof experienceRootMetadata.description).toBe('string');
    });

    it('has keywords array', () => {
      expect(Array.isArray(experienceRootMetadata.keywords)).toBe(true);
    });

    it('has alternates with canonical', () => {
      expect(experienceRootMetadata.alternates).toBeDefined();
      expect(
        (experienceRootMetadata.alternates as { canonical: string }).canonical
      ).toBeDefined();
    });

    it('has openGraph field', () => {
      expect(experienceRootMetadata.openGraph).toBeDefined();
      expect(typeof experienceRootMetadata.openGraph).toBe('object');
    });

    it('has twitter field', () => {
      expect(experienceRootMetadata.twitter).toBeDefined();
      expect(typeof experienceRootMetadata.twitter).toBe('object');
    });
  });
});

// ---------------------------------------------------------------------------
// buildPostMetadata
// ---------------------------------------------------------------------------

describe('buildPostMetadata', () => {
  const projectMeta: PostMetadata = {
    title: 'Test Project',
    date: '2025-01-01',
    excerpt: 'A test project description',
    author: 'Daniel Joffe',
    category: 'Testing',
    tags: ['React', 'TypeScript'],
    slug: 'test-project',
    type: 'project',
  };

  const experienceMeta: PostMetadata = {
    title: 'Test Company',
    date: '2020-01-01',
    excerpt: 'A test experience description',
    author: 'Daniel Joffe',
    category: 'Career Experience',
    tags: ['React'],
    slug: 'test-company',
    type: 'experience',
    company: 'Test Co',
    role: 'Engineer',
    duration: 'Jan 2020 - Dec 2021',
    industry: 'Tech',
  };

  it('returns metadata with correct title for projects', () => {
    const result = buildPostMetadata(projectMeta);
    expect(result.title).toBe('Project | Test Project');
  });

  it('returns metadata with correct title for experience', () => {
    const result = buildPostMetadata(experienceMeta);
    expect(result.title).toBe('Experience | Test Company');
  });

  it('uses excerpt as description', () => {
    const result = buildPostMetadata(projectMeta);
    expect(result.description).toBe('A test project description');
  });

  it('uses tags as keywords', () => {
    const result = buildPostMetadata(projectMeta);
    expect(result.keywords).toEqual(['React', 'TypeScript']);
  });

  it('sets canonical URL for projects', () => {
    const result = buildPostMetadata(projectMeta);
    expect((result.alternates as { canonical: string }).canonical).toBe(
      '/projects/test-project'
    );
  });

  it('sets canonical URL for experience', () => {
    const result = buildPostMetadata(experienceMeta);
    expect((result.alternates as { canonical: string }).canonical).toBe(
      '/experience/test-company'
    );
  });

  it('has openGraph field', () => {
    const result = buildPostMetadata(projectMeta);
    expect(result.openGraph).toBeDefined();
    expect(typeof result.openGraph).toBe('object');
  });

  it('has twitter field', () => {
    const result = buildPostMetadata(projectMeta);
    expect(result.twitter).toBeDefined();
    expect(typeof result.twitter).toBe('object');
  });

  it('returns metadata with correct title for blog', () => {
    const blogMeta: PostMetadata = {
      title: 'Test Blog Post',
      date: '2026-04-01',
      excerpt: 'A test blog description',
      author: 'Daniel Joffe',
      category: 'Frontend',
      tags: ['React'],
      slug: 'test-blog-post',
      type: 'blog',
      topic: 'Performance',
    };
    const result = buildPostMetadata(blogMeta);
    expect(result.title).toBe('Blog | Test Blog Post');
  });

  it('sets canonical URL for blog', () => {
    const blogMeta: PostMetadata = {
      title: 'Test Blog Post',
      date: '2026-04-01',
      excerpt: 'A test blog description',
      author: 'Daniel Joffe',
      category: 'Frontend',
      tags: ['React'],
      slug: 'test-blog-post',
      type: 'blog',
    };
    const result = buildPostMetadata(blogMeta);
    expect((result.alternates as { canonical: string }).canonical).toBe(
      '/blog/test-blog-post'
    );
  });
});
