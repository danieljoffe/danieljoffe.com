import type { EntryType, SearchEntry } from './searchIndex';
import { buildSearchIndex } from './searchIndex';

type TagContentEntry = Pick<
  SearchEntry,
  'slug' | 'title' | 'excerpt' | 'tags' | 'type' | 'url' | 'date'
>;

/** Scoped content type for tag helpers: blog, project, or experience. */
type TagEntryType = Exclude<EntryType, 'page'>;

const CONTENT_TYPES: readonly TagEntryType[] = [
  'blog',
  'project',
  'experience',
];

function isContentType(type: EntryType): type is TagEntryType {
  return (CONTENT_TYPES as readonly EntryType[]).includes(type);
}

/**
 * Returns all content entries across the three content types, optionally
 * scoped to a single type. Entries are mapped down to the fields relevant to
 * tag discovery (slug, title, excerpt, tags, type, url).
 *
 * The `type` parameter is optional so existing callers that want a mixed list
 * (like the original `/blog/tags/[tag]` route) keep working unchanged.
 */
function getAllContent(type?: TagEntryType): TagContentEntry[] {
  return buildSearchIndex()
    .filter(entry => (type ? entry.type === type : isContentType(entry.type)))
    .map(({ slug, title, excerpt, tags, type: entryType, url, date }) => ({
      slug,
      title,
      excerpt,
      tags,
      type: entryType,
      url,
      date,
    }));
}

export function getAllTags(type?: TagEntryType): string[] {
  const tagSet = new Set<string>();
  for (const { tags } of getAllContent(type)) {
    for (const tag of tags) tagSet.add(tag);
  }
  return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
}

export function getContentByTag(
  tag: string,
  type?: TagEntryType
): TagContentEntry[] {
  return getAllContent(type)
    .filter(entry => entry.tags.includes(tag))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function getTagCounts(type?: TagEntryType): Map<string, number> {
  const counts = new Map<string, number>();
  for (const { tags } of getAllContent(type)) {
    for (const tag of tags) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  return counts;
}

/**
 * Returns the top `limit` tags for a content type, sorted by post count
 * descending with alphabetical tie-breaking.
 */
export function getTopTags(
  type: TagEntryType,
  limit: number
): Array<{ name: string; count: number }> {
  const counts = getTagCounts(type);
  return Array.from(counts.entries())
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    })
    .slice(0, Math.max(0, limit))
    .map(([name, count]) => ({ name, count }));
}

export function tagToSlug(tag: string): string {
  return encodeURIComponent(tag.toLowerCase().replace(/\s+/g, '-'));
}

export function slugToTag(slug: string, allTags: string[]): string | undefined {
  const decoded = decodeURIComponent(slug).replace(/-/g, ' ');
  return allTags.find(tag => tag.toLowerCase() === decoded.toLowerCase());
}
