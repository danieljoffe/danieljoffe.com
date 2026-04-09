import { buildSearchIndex } from './searchIndex';

export interface ContentEntry {
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  type: string;
  url: string;
  date?: string;
}

export function getAllContent(): ContentEntry[] {
  const allEntries = buildSearchIndex();
  return allEntries
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
  const allContent = getAllContent();
  const tagSet = new Set<string>();
  allContent.forEach(content => {
    content.tags.forEach(tag => tagSet.add(tag));
  });
  return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
}

export function getContentByTag(tag: string): ContentEntry[] {
  const allContent = getAllContent();
  return allContent
    .filter(content => content.tags.includes(tag))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function getTagCounts(): Map<string, number> {
  const allContent = getAllContent();
  const counts = new Map<string, number>();
  allContent.forEach(content => {
    content.tags.forEach(tag => {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    });
  });
  return counts;
}

export function tagToSlug(tag: string): string {
  return encodeURIComponent(tag.toLowerCase().replace(/\s+/g, '-'));
}

export function slugToTag(slug: string, allTags: string[]): string | undefined {
  const decoded = decodeURIComponent(slug).replace(/-/g, ' ');
  return allTags.find(tag => tag.toLowerCase() === decoded.toLowerCase());
}
