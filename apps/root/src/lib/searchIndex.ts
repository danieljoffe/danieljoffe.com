import generatedIndex from '@/data/generated/searchIndex.json';

type EntryType = 'blog' | 'project' | 'experience' | 'page';
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
}

// TODO: SearchEntry should have date and author fields, but they are currently missing from the generated index.
// TODO: ... Need to update the generator script to include them.
export interface SearchIndexItem extends SearchEntry {
  date: string;
  author: string;
}

const staticEntries: SearchIndexItem[] = [
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
    date: '',
    author: 'Daniel Joffe',
  },
  {
    id: 'page:services',
    slug: 'services',
    type: 'page',
    title: 'Services',
    excerpt: 'What I offer',
    tags: [],
    category: 'page',
    body: '',
    url: '/services',
    date: '',
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
    date: '',
    author: 'Daniel Joffe',
  },
];

export function buildSearchIndex(): SearchIndexItem[] {
  return [
    ...(generatedIndex as unknown as SearchIndexItem[]),
    ...staticEntries,
  ];
}
