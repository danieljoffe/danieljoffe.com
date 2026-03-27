import fs from 'node:fs';
import path from 'node:path';
import { AllowedProjectSlugs, AllowedExperienceSlugs } from '@/types/base';
import { projectPageSlugs } from '@/data/project';
import { experiencePageSlugs } from '@/data/experience';
import { calculateReadingTime } from '@/utils/readingTime';

const CONTENT_DIR = path.join(process.cwd(), 'src/data/content');

function readMdxFile(type: 'projects' | 'experience', slug: string): string {
  const filePath = path.join(CONTENT_DIR, type, `${slug}.mdx`);
  return fs.readFileSync(filePath, 'utf-8');
}

function buildReadingTimeMap<T extends string>(
  slugs: readonly T[],
  type: 'projects' | 'experience',
): Record<T, number> {
  const map = {} as Record<T, number>;
  for (const slug of slugs) {
    map[slug] = calculateReadingTime(readMdxFile(type, slug));
  }
  return map;
}

export const projectReadingTimes: Record<AllowedProjectSlugs, number> =
  buildReadingTimeMap(projectPageSlugs, 'projects');

export const experienceReadingTimes: Record<AllowedExperienceSlugs, number> =
  buildReadingTimeMap(experiencePageSlugs, 'experience');
