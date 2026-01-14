import { MetadataRoute } from 'next';
import {
  ABOUT_LINK,
  EXPERIENCE_LINK,
  PROJECTS_LINK,
} from '@/components/assembled/Nav/Links';
import { DOMAIN_URL } from '@/utils/constants';
import { pagesRecords } from './projects/constants';
import { experiencePageSlugs } from '@/data/base';

export default function sitemap(): MetadataRoute.Sitemap {
  // Static routes
  const staticRoutes = [
    {
      url: DOMAIN_URL,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 1,
    },
    {
      url: `${DOMAIN_URL}${ABOUT_LINK.href}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${DOMAIN_URL}${PROJECTS_LINK.href}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${DOMAIN_URL}${EXPERIENCE_LINK.href}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
  ];

  // Dynamic experience routes
  const experienceRoutes = experiencePageSlugs.map(slug => ({
    url: `${DOMAIN_URL}${EXPERIENCE_LINK.href}/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'yearly' as const,
    priority: 0.6,
  }));

  // Dynamic project routes
  const projectRoutes = Object.keys(pagesRecords).map(slug => ({
    url: `${DOMAIN_URL}${PROJECTS_LINK.href}/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...experienceRoutes, ...projectRoutes];
}
