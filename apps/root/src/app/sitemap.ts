import { MetadataRoute } from 'next';

import {
  DOMAIN_URL,
  ABOUT_LINK,
  AUDIT_LINK,
  BLOG_LINK,
  EXPERIENCE_LINK,
  PROJECTS_LINK,
  SERVICES_LINK,
} from '@/utils/constants';
import { experiencePageSlugs } from '@/data/experience';
import { projectPageSlugs } from '@/data/project';
import { blogPageSlugs } from '@/data/blog';

// Stable build-time date so sitemap doesn't change on every deployment
const BUILD_DATE = new Date('2026-03-05');

export default function sitemap(): MetadataRoute.Sitemap {
  // Static routes
  const staticRoutes = [
    {
      url: DOMAIN_URL,
      lastModified: BUILD_DATE,
      changeFrequency: 'monthly' as const,
      priority: 1,
    },
    {
      url: `${DOMAIN_URL}${ABOUT_LINK.href}`,
      lastModified: BUILD_DATE,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${DOMAIN_URL}${SERVICES_LINK.href}`,
      lastModified: BUILD_DATE,
      changeFrequency: 'monthly' as const,
      priority: 0.9,
    },
    {
      url: `${DOMAIN_URL}${PROJECTS_LINK.href}`,
      lastModified: BUILD_DATE,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${DOMAIN_URL}${EXPERIENCE_LINK.href}`,
      lastModified: BUILD_DATE,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${DOMAIN_URL}${BLOG_LINK.href}`,
      lastModified: BUILD_DATE,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${DOMAIN_URL}${AUDIT_LINK.href}`,
      lastModified: BUILD_DATE,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
  ];

  // Dynamic experience routes
  const experienceRoutes = experiencePageSlugs.map(slug => ({
    url: `${DOMAIN_URL}${EXPERIENCE_LINK.href}/${slug}`,
    lastModified: BUILD_DATE,
    changeFrequency: 'yearly' as const,
    priority: 0.6,
  }));

  // Dynamic project routes
  const projectRoutes = projectPageSlugs.map(slug => ({
    url: `${DOMAIN_URL}${PROJECTS_LINK.href}/${slug}`,
    lastModified: BUILD_DATE,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  // Dynamic blog routes
  const blogRoutes = blogPageSlugs.map(slug => ({
    url: `${DOMAIN_URL}${BLOG_LINK.href}/${slug}`,
    lastModified: BUILD_DATE,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...experienceRoutes, ...projectRoutes, ...blogRoutes];
}
