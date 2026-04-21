import { MetadataRoute } from 'next';
import {
  DOMAIN_URL,
  ABOUT_LINK,
  AUDIT_LINK,
  AUDIT_INSIGHTS_LINK,
  BLOG_LINK,
  BLOG_TAGS_LINK,
  EXPERIENCE_LINK,
  POSTS_PER_PAGE,
  PROJECTS_LINK,
  PROJECTS_TAGS_LINK,
  SERVICES_LINK,
} from '@/utils/constants';
import { experiencePageSlugs } from '@/data/experience';
import { projectPageSlugs } from '@/data/project';
import { blogPageSlugs } from '@/data/blog';
import { getAllTags, tagToSlug } from '@/lib/tags';

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
    {
      url: `${DOMAIN_URL}${AUDIT_INSIGHTS_LINK.href}`,
      lastModified: BUILD_DATE,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
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

  // Paginated blog index routes (page 1 lives at /blog and is already in
  // staticRoutes above; only emit pages 2..N here).
  const totalBlogPages = Math.max(
    1,
    Math.ceil(blogPageSlugs.length / POSTS_PER_PAGE)
  );
  const blogPaginationRoutes = Array.from(
    { length: Math.max(0, totalBlogPages - 1) },
    (_, i) => ({
      url: `${DOMAIN_URL}${BLOG_LINK.href}/page/${i + 2}`,
      lastModified: BUILD_DATE,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })
  );

  // Blog tag discovery routes. Index at /blog/tags plus one detail page
  // per blog tag.
  const blogTagsIndexRoute = {
    url: `${DOMAIN_URL}${BLOG_TAGS_LINK.href}`,
    lastModified: BUILD_DATE,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  };
  const blogTagRoutes = getAllTags('blog').map(tag => ({
    url: `${DOMAIN_URL}${BLOG_TAGS_LINK.href}/${tagToSlug(tag)}`,
    lastModified: BUILD_DATE,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }));

  // Project tag discovery routes (parity with blog tag routes).
  const projectTagsIndexRoute = {
    url: `${DOMAIN_URL}${PROJECTS_TAGS_LINK.href}`,
    lastModified: BUILD_DATE,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  };
  const projectTagRoutes = getAllTags('project').map(tag => ({
    url: `${DOMAIN_URL}${PROJECTS_TAGS_LINK.href}/${tagToSlug(tag)}`,
    lastModified: BUILD_DATE,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }));

  return [
    ...staticRoutes,
    ...experienceRoutes,
    ...projectRoutes,
    ...blogRoutes,
    ...blogPaginationRoutes,
    blogTagsIndexRoute,
    ...blogTagRoutes,
    projectTagsIndexRoute,
    ...projectTagRoutes,
  ];
}
