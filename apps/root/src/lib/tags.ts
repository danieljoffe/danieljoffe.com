import type { SearchEntry } from './searchIndex';
import { buildSearchIndex } from './searchIndex';

export type TagContentEntry = Pick<
  SearchEntry,
  'slug' | 'title' | 'excerpt' | 'tags' | 'type' | 'url'
>;

export function getAllContent(): TagContentEntry[] {
  return buildSearchIndex()
    .filter(entry => ['blog', 'project', 'experience'].includes(entry.type))
    .map(({ slug, title, excerpt, tags, type, url }) => ({
      slug,
      title,
      excerpt,
      tags,
      type,
      url,
    }));
}

export function getAllTags(): string[] {
  const tagSet = new Set<string>();
  for (const { tags } of getAllContent()) {
    for (const tag of tags) tagSet.add(tag);
  }
  return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
}

export function getContentByTag(tag: string): TagContentEntry[] {
  return getAllContent()
    .filter(entry => entry.tags.includes(tag))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function getTagCounts(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const { tags } of getAllContent()) {
    for (const tag of tags) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  return counts;
}

export function tagToSlug(tag: string): string {
  return encodeURIComponent(tag.toLowerCase().replace(/\s+/g, '-'));
}

export function slugToTag(slug: string, allTags: string[]): string | undefined {
  const decoded = decodeURIComponent(slug).replace(/-/g, ' ');
  return allTags.find(tag => tag.toLowerCase() === decoded.toLowerCase());
}
