import MiniSearch from 'minisearch';
import { createSearchEngine, searchWithHighlights } from '../search';
import { buildSearchIndex, type SearchEntry } from '../searchIndex';

describe('MiniSearch Engine', () => {
  let entries: SearchEntry[];

  beforeEach(() => {
    entries = [
      {
        id: 'blog:react-post',
        title: 'React Best Practices',
        excerpt: 'Learn React optimization',
        tags: ['react', 'frontend'],
        category: 'tutorial',
        type: 'blog',
        slug: 'react-post',
        url: '/blog/react-post',
        body: 'React is a JavaScript library for building user interfaces.',
      },
      {
        id: 'blog:vue-post',
        title: 'Vue.js Guide',
        excerpt: 'Getting started with Vue',
        tags: ['vue', 'frontend'],
        category: 'tutorial',
        type: 'blog',
        slug: 'vue-post',
        url: '/blog/vue-post',
        body: 'Vue is a progressive framework for building UIs.',
      },
      {
        id: 'blog:backend-post',
        title: 'Node.js Performance',
        excerpt: 'Optimize your backend',
        tags: ['node', 'backend'],
        category: 'performance',
        type: 'blog',
        slug: 'node-post',
        url: '/blog/node-post',
        body: 'Node.js is a JavaScript runtime for server-side development.',
      },
    ];
  });

  it('should create a search engine with all entries', () => {
    const engine = createSearchEngine(entries);
    expect(engine).toBeInstanceOf(MiniSearch);
    expect(engine.search('react').length).toBeGreaterThan(0);
  });

  it('should boost title matches higher than body matches', () => {
    const engine = createSearchEngine(entries);
    const results = engine.search('react');

    expect(results[0]?.id).toBe('blog:react-post');
    if (results[1]) {
      expect(results[0].score).toBeGreaterThan(results[1].score);
    }
  });

  it('should handle typos with fuzzy matching', () => {
    const engine = createSearchEngine(entries);
    const results = engine.search('ract'); // typo for "react"

    expect(results.some(r => r.id === 'blog:react-post')).toBe(true);
  });

  it('should support prefix matching', () => {
    const engine = createSearchEngine(entries);
    const results = engine.search('perf'); // prefix of "performance"

    expect(results.some(r => r.id === 'blog:backend-post')).toBe(true);
  });

  it('should return empty array for empty query', () => {
    const engine = createSearchEngine(entries);
    const results = searchWithHighlights(engine, '', entries);
    expect(results).toEqual([]);
  });

  it('should search across multiple fields', () => {
    const engine = createSearchEngine(entries);

    // Search in tags field
    const frontendResults = engine.search('frontend');
    expect(frontendResults.length).toBe(2);

    // Search in body field
    const jsResults = engine.search('JavaScript');
    expect(jsResults.length).toBeGreaterThan(0);
  });

  it('should return results with highlight information', () => {
    const engine = createSearchEngine(entries);
    const results = searchWithHighlights(engine, 'react', entries);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty('matches');
    expect(results[0]?.id).toBe('blog:react-post');
  });

  it('does not fuzzy-match short queries into stopwords like "to"', () => {
    // fuzzy on a ≤3-char term accepts an edit that turns "toc" into "to",
    // matching every document. The engine must gate fuzzy off at that
    // length so short queries only exact/prefix match.
    const shortEntries: SearchEntry[] = [
      {
        ...entries[0],
        id: 'blog:toc-post',
        title: 'TOC scroll spy',
        excerpt: 'Table of contents',
        tags: [],
        body: 'Building a toc component.',
      },
      {
        ...entries[0],
        id: 'blog:unrelated',
        title: 'Unrelated post',
        excerpt: 'Nothing relevant',
        tags: [],
        body: 'How to build things and how to ship them.',
      },
    ];
    const engine = createSearchEngine(shortEntries);
    const results = engine.search('toc');
    expect(results.map(r => r.id)).toEqual(['blog:toc-post']);
  });

  it('drops the barely-relevant OR tail below the relative score floor', () => {
    const floorEntries: SearchEntry[] = [
      {
        ...entries[0],
        id: 'blog:strong',
        title: 'Service worker deep dive',
        excerpt: 'service worker internals',
        tags: ['service-worker'],
        body: 'service worker service worker service worker',
      },
      {
        ...entries[0],
        id: 'blog:weak',
        title: 'Unrelated ramble',
        excerpt: 'nothing here',
        tags: [],
        body: [
          'a very long body where the word service appears exactly once',
          ...Array(120).fill('filler words diluting term frequency badly'),
        ].join(' '),
      },
    ];
    const engine = createSearchEngine(floorEntries);
    const raw = engine.search('service worker');
    const filtered = searchWithHighlights(
      engine,
      'service worker',
      floorEntries
    );
    expect(raw.map(r => r.id)).toContain('blog:weak');
    expect(filtered.map(r => r.id)).toEqual(['blog:strong']);
  });

  it('finds the Résumé page by the unaccented spelling everyone types', () => {
    // The tokenizer does no diacritic folding and fuzzy matching cannot
    // bridge résumé→resume, so the static entry must carry the plain
    // spelling in a searchable field. Guards the palette "resume" query.
    const engine = createSearchEngine(buildSearchIndex());
    const results = engine.search('resume');
    expect(results.some(r => r.id === 'page:resume')).toBe(true);
  });
});
