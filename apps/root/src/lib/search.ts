import MiniSearch from 'minisearch';
import type { SearchEntry } from './searchIndex';

export function createSearchEngine(
  entries: SearchEntry[]
): MiniSearch<SearchEntry> {
  const ms = new MiniSearch<SearchEntry>({
    fields: ['title', 'excerpt', 'tags', 'category', 'body'] as Array<
      keyof SearchEntry
    >,
    storeFields: [
      'title',
      'excerpt',
      'tags',
      'category',
      'type',
      'slug',
      'url',
    ] as Array<keyof SearchEntry>,
    searchOptions: {
      boost: { title: 5, tags: 3.5, excerpt: 2, category: 1.5, body: 1 },
      fuzzy: 0.2,
      prefix: true,
      combineWith: 'OR',
    },
    extractField: (doc: SearchEntry, fieldName: string): string => {
      if (fieldName === 'tags') return doc.tags.join(' ');
      if (fieldName === 'category') return doc.category || '';
      const value = doc[fieldName as keyof SearchEntry];
      return typeof value === 'string' ? value : '';
    },
  });

  ms.addAll(entries);
  return ms;
}

export function searchWithHighlights(
  engine: MiniSearch<SearchEntry>,
  query: string,
  entries: SearchEntry[]
): Array<SearchEntry & { matches: Record<string, string[]> }> {
  if (!query.trim()) return [];

  const results = engine.search(query);

  return results
    .map(result => {
      const entry = entries.find(e => e.id === result.id);
      if (!entry) return null;

      const matches: Record<string, string[]> = {};
      Object.entries(result.match).forEach(([field, terms]) => {
        if (terms && typeof terms === 'object') {
          matches[field] = Object.keys(
            terms as unknown as Record<string, boolean>
          );
        }
      });

      return { ...entry, matches };
    })
    .filter(
      (item): item is SearchEntry & { matches: Record<string, string[]> } =>
        item !== null
    );
}
