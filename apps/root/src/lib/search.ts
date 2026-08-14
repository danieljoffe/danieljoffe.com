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
      // No fuzzing for terms of ≤3 chars: at that length one accepted edit
      // turns "toc" into "to"/"doc"/"hoc", which matches every document in
      // the corpus and inflates result counts to "everything, ranked".
      fuzzy: term => (term.length > 3 ? 0.2 : false),
      prefix: term => term.length >= 2,
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

/**
 * OR-combined multi-term queries match any document containing any term, so
 * the result list grows a long tail of barely-relevant hits (score ~0.01
 * against a top of ~13). Results below this fraction of the top score are
 * noise, not answers — drop them so counts reflect what a reader would call
 * a match.
 */
const RELATIVE_SCORE_FLOOR = 0.05;

export function searchWithHighlights(
  engine: MiniSearch<SearchEntry>,
  query: string,
  entries: SearchEntry[]
): Array<SearchEntry & { matches: Record<string, string[]> }> {
  if (!query.trim()) return [];

  const ranked = engine.search(query);
  const topScore = ranked[0]?.score ?? 0;
  const results = ranked.filter(
    r => r.score >= topScore * RELATIVE_SCORE_FLOOR
  );

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
