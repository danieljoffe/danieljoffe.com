import {
  AllowedProjectSlugs,
  AllowedExperienceSlugs,
  NavLink,
} from '@/types/base';
import { projectSlugs } from '@/data/project';
import { experienceSlugs } from '@/data/experience';
import { PROJECTS_LINK, EXPERIENCE_LINK } from '@/utils/constants';
import { projectsRecords } from '@/data/projectThumbnails';
import { experienceRecords } from '@/data/experienceThumbnails';

export interface PaginationLink {
  slug: string;
  title: string;
  href: string;
}

export interface PostPaginationData {
  prev: PaginationLink | undefined;
  next: PaginationLink | undefined;
}

/**
 * Project history in chronological order based on git creation dates.
 *
 * Git history:
 *   ui-components-v1       — 2025-09-04
 *   cms-tooling-case-study — 2026-01-11 (Winc, Jun 2015)
 *   component-library      — 2026-01-11 (IB, Mar 2018)
 *   accessibility-serials  — 2026-01-11 (TLC, Sep 2019)
 *   performance-case-study — 2026-01-11 (FightCamp, Nov 2021)
 *   logistics-dashboard    — 2026-01-11 (Contract, May 2023)
 *   portfolio-modern       — 2026-01-11 (Portfolio, Jul 2025)
 *   ui-components-v2       — 2026-01-29
 *
 * Entries sharing the same git date are sub-sorted by the chronology
 * of the work they describe.
 */
export const projectHistory: AllowedProjectSlugs[] = [
  projectSlugs.uiV1, // 2025-09-04
  projectSlugs.csCMSTooling, // 2026-01-11 — Winc (Jun 2015)
  projectSlugs.csCLibrary, // 2026-01-11 — Internet Brands (Mar 2018)
  projectSlugs.csA11y, // 2026-01-11 — TLC (Sep 2019)
  projectSlugs.csPerformance, // 2026-01-11 — FightCamp (Nov 2021)
  projectSlugs.csLogisticsDashboard, // 2026-01-11 — Contract (May 2023)
  projectSlugs.csModernPractice, // 2026-01-11 — Portfolio (Jul 2025)
  projectSlugs.uiV2, // 2026-01-29
];

/**
 * Experience history in chronological order (by employment start date).
 */
export const experienceHistory: AllowedExperienceSlugs[] = [
  experienceSlugs.Winc, // Jun 2015
  experienceSlugs.IB, // Mar 2018
  experienceSlugs.TLC, // Sep 2019
  experienceSlugs.FC, // Nov 2021
  experienceSlugs.SD, // Jan 2023
];

function buildPaginationData(
  slug: string,
  orderedSlugs: readonly string[],
  records: Record<string, { title: string }>,
  basePath: NavLink
): PostPaginationData {
  const index = orderedSlugs.indexOf(slug);

  const prev =
    index > 0
      ? {
          slug: orderedSlugs[index - 1],
          title: records[orderedSlugs[index - 1]].title,
          href: `${basePath.href}/${orderedSlugs[index - 1]}`,
        }
      : undefined;

  const next =
    index < orderedSlugs.length - 1
      ? {
          slug: orderedSlugs[index + 1],
          title: records[orderedSlugs[index + 1]].title,
          href: `${basePath.href}/${orderedSlugs[index + 1]}`,
        }
      : undefined;

  return { prev, next };
}

export function getProjectPagination(
  slug: AllowedProjectSlugs
): PostPaginationData {
  return buildPaginationData(
    slug,
    projectHistory,
    projectsRecords,
    PROJECTS_LINK
  );
}

export function getExperiencePagination(
  slug: AllowedExperienceSlugs
): PostPaginationData {
  return buildPaginationData(
    slug,
    experienceHistory,
    experienceRecords,
    EXPERIENCE_LINK
  );
}
