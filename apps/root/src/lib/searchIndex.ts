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
    id: 'page:audit',
    slug: 'audit',
    type: 'page',
    title: 'Audit',
    excerpt:
      'Service for auditing web applications and providing actionable feedback',
    tags: [],
    category: 'page',
    body: '',
    url: '/audit',
    date: null,
    author: 'Daniel Joffe',
  },
];

export function buildSearchIndex(): SearchEntry[] {
  return [...(generatedIndex as SearchEntry[]), ...staticEntries];
}
