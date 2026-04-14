/**
 * Zod schemas for validating MDX content metadata.
 *
 * Encodes the rules from .claude/docs/content-style-guide.md as executable
 * checks: canonical categories, canonical tags, character limits, cover image
 * format, and type-specific required fields.
 */
import { z } from 'zod/v4';

// ---------------------------------------------------------------------------
// Canonical vocabularies (from content-style-guide.md)
// ---------------------------------------------------------------------------

export const CONTENT_TYPES = ['project', 'experience', 'blog'] as const;

export const CATEGORIES = [
  'Frontend Engineering',
  'Design Systems',
  'Accessibility',
  'Performance',
  'Full-Stack Development',
  'Tooling & CI',
  'Architecture',
  'Testing',
  'Career Experience',
] as const;

export const CANONICAL_TAGS = [
  // Frameworks & libraries
  'React',
  'Next.js',
  'Vue.js',
  'Nuxt.js',
  'Angular',
  'AngularJS',
  'Redux',
  'GraphQL',
  'Storybook',
  'Express',
  'MDX',
  'GSAP',
  // Languages & runtimes
  'TypeScript',
  'Node.js',
  'Java',
  'Bash',
  // Styling
  'Tailwind CSS',
  'Styled Components',
  'CSS',
  'HTML5',
  // Monorepo & build
  'Nx',
  'pnpm',
  'Monorepo',
  'Webpack',
  // Testing & CI
  'Jest',
  'Playwright',
  'E2E Testing',
  'Visual Regression',
  'CI/CD',
  'GitHub Actions',
  // Observability
  'Sentry',
  'Lighthouse',
  // Web APIs & standards
  'ARIA',
  'WCAG',
  'SSR',
  'SSG',
  'PWA',
  'SVG',
  // Cloud & services
  'Vercel',
  'AWS Cognito',
  'S3',
  'CDN',
  // Cross-reference tags
  'Accessibility',
  'Performance',
  'Design Systems',
  'Component Library',
  'Testing',
  'Architecture',
  // Specializations
  'Forms',
  'Search',
  'Security',
  'Mobile',
  'UX',
  'REST APIs',
] as const;

/** Merge map for non-canonical synonyms → canonical form. */
export const TAG_MERGES: Record<string, string> = {
  'Accessibility (a11y)': 'Accessibility',
  a11y: 'Accessibility',
  'Performance Optimization': 'Performance',
  Perf: 'Performance',
  'Component Libraries': 'Component Library',
  'Mobile Optimization': 'Mobile',
  'Mobile UX': 'Mobile',
  Cognito: 'AWS Cognito',
  PWAs: 'PWA',
  CSS3: 'CSS',
  HTML: 'HTML5',
  CI: 'CI/CD',
};

const canonicalTagSet = new Set<string>(CANONICAL_TAGS);

// ---------------------------------------------------------------------------
// Sub-schemas
// ---------------------------------------------------------------------------

const coverSchema = z.object({
  alt: z.string().min(1, 'Cover alt text is required'),
  src: z
    .string()
    .regex(
      /^\/images\/covers\/[a-z0-9-]+\.webp$/,
      'Cover src must match /images/covers/{slug}.webp'
    ),
});

// ---------------------------------------------------------------------------
// Base schema (fields common to all content types)
// ---------------------------------------------------------------------------

const baseSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(60, 'Title must be ≤ 60 characters'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  excerpt: z
    .string()
    .min(1, 'Excerpt is required')
    .max(160, 'Excerpt must be ≤ 160 characters')
    .refine(
      val => !val.includes('\u2014'),
      'Excerpt must not contain em dashes (per style guide)'
    ),
  author: z.literal('Daniel Joffe'),
  category: z.enum(CATEGORIES),
  tags: z
    .array(z.string())
    .min(3, 'At least 3 tags required')
    .max(8, 'At most 8 tags allowed')
    .refine(
      tags => tags.every(t => canonicalTagSet.has(t) || t in TAG_MERGES),
      'All tags must be from the canonical tag set (see content-style-guide.md)'
    ),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug must be lowercase kebab-case'),
  type: z.enum(CONTENT_TYPES),
  cover: coverSchema,
});

// ---------------------------------------------------------------------------
// Type-specific schemas
// ---------------------------------------------------------------------------

const blogSchema = baseSchema.extend({
  type: z.literal('blog'),
});

const projectSchema = baseSchema.extend({
  type: z.literal('project'),
  featured: z.boolean().optional(),
  company: z.string().optional(),
  role: z.string().optional(),
  duration: z.string().optional(),
});

const experienceSchema = baseSchema.extend({
  type: z.literal('experience'),
  category: z.literal('Career Experience'),
  company: z.string().min(1, 'Experience entries require a company'),
  role: z.string().min(1, 'Experience entries require a role'),
  duration: z.string().min(1, 'Experience entries require a duration'),
  industry: z.string().min(1, 'Experience entries require an industry'),
  logo: z.string().min(1, 'Experience entries require a logo path'),
  invert: z.boolean(),
  domain: z.string().url().optional(),
});

// ---------------------------------------------------------------------------
// Discriminated union
// ---------------------------------------------------------------------------

export const postMetadataSchema = z.discriminatedUnion('type', [
  blogSchema,
  projectSchema,
  experienceSchema,
]);

export type ValidatedPostMetadata = z.infer<typeof postMetadataSchema>;
