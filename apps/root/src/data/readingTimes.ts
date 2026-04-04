import fs from 'node:fs';
import path from 'node:path';
import {
  AllowedProjectSlugs,
  AllowedExperienceSlugs,
  AllowedBlogSlugs,
} from '@/types/base';
import { projectPageSlugs } from '@/data/project';
import { experiencePageSlugs } from '@/data/experience';
import { blogPageSlugs } from '@/data/blog';
import { calculateReadingTime } from '@/utils/readingTime';

const CONTENT_DIR = path.join(process.cwd(), 'src/data/content');

function readMdxFile(contentDir: string, slug: string): string {
  const filePath = path.join(CONTENT_DIR, contentDir, `${slug}.mdx`);
  return fs.readFileSync(filePath, 'utf-8');
}

function buildReadingTimeMap<T extends string>(
  slugs: readonly T[],
  contentDir: string
): Record<T, number> {
  const map = {} as Record<T, number>;
  for (const slug of slugs) {
    map[slug] = calculateReadingTime(readMdxFile(contentDir, slug));
  }
  return map;
}

export const projectReadingTimes: Record<AllowedProjectSlugs, number> =
  buildReadingTimeMap(projectPageSlugs, 'projects');

export const experienceReadingTimes: Record<AllowedExperienceSlugs, number> =
  buildReadingTimeMap(experiencePageSlugs, 'experience');

export const blogReadingTimes: Record<AllowedBlogSlugs, number> =
  buildReadingTimeMap(blogPageSlugs, 'blog');
