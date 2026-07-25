import generatedIndex from '@/data/generated/searchIndex.json';

export type EntryType = 'blog' | 'project' | 'experience' | 'page';

export interface SearchEntry {
  id: string;
  title: string;
  excerpt: string;
  tags: string[];
  category: string;
  type: EntryType;
  slug: string;
  url: string;
  body: string;
  date: string | null;
  author: string | null;
}

const staticEntries: SearchEntry[] = [
  {
    id: 'page:about',
    slug: 'about',
    type: 'page',
    title: 'About',
    excerpt: 'Learn about my background and experience',
    tags: [],
    category: 'page',
    body: '',
    url: '/about',
    date: null,
    author: 'Daniel Joffe',
  },
  {
    id: 'page:resume',
    slug: 'resume',
    type: 'page',
    title: 'Résumé',
    // "resume" (unaccented) must appear in a searchable field: the
    // tokenizer does no diacritic folding, and fuzzy matching cannot
    // bridge résumé→resume — without this the page is unfindable by
    // the spelling everyone actually types.
    excerpt: 'View and download my resume (CV)',
    tags: ['resume', 'cv'],
    category: 'page',
    body: '',
    url: '/resume',
    date: null,
    author: 'Daniel Joffe',
  },
];

export function buildSearchIndex(): SearchEntry[] {
  return [...(generatedIndex as SearchEntry[]), ...staticEntries];
}
