# Content Posts

## MDX File Structure

All content lives in `apps/root/src/data/content/`. Every MDX file **must** include an `export const metadata` block as its source-of-truth metadata. This is valid JS that works in both Turbopack (dev) and webpack (build) without rendering visible content:

```mdx
export const metadata = {
  title: 'Catchy, descriptive title',
  date: 'YYYY-MM-DD', // Projects: git creation date. Experience: employment start date.
  order: 150, // Display sort key (ascending) within this content type. Sparse *10s, unique.
  excerpt: 'One-sentence summary for previews and SEO',
  author: 'Daniel Joffe',
  category: 'Category Name', // e.g. 'Design Systems', 'Performance Engineering', 'Career Experience'
  tags: ['Tag1', 'Tag2'],
  slug: 'url-slug',
  type: 'project', // 'project' | 'experience'
  // Optional context fields (include when applicable):
  company: 'Company Name',
  role: 'Job Title',
  duration: 'Month YYYY - Month YYYY',
  industry: 'Industry / Sector',
};
```

Page-level SEO metadata is derived automatically from the MDX `metadata` export via `buildPostMetadata()` in `lib/buildPostMetadata.ts` — no separate metadata file needed for individual posts.

- **Projects** (`data/content/projects/`): `date` is the git creation date of the file. Query with `git log --diff-filter=A --follow --format="%ai" -- <file> | tail -1`.
- **Experience** (`data/content/experience/`): `date` is the employment start date (e.g. `2021-11-01` for "November 2021").

## Content Registry

All content access goes through `data/contentRegistry.ts` — the single source of truth for querying content:

```ts
import {
  getContentByType,
  getContentBySlug,
  getContentSlugs,
  getContentPagination,
  getAllContent,
} from '@/data/contentRegistry';

getContentByType('project'); // All project entries in display order
getContentBySlug('blog', slug); // Single entry by type + slug
getContentSlugs('experience'); // All slugs (for generateStaticParams)
getContentPagination('blog', s); // { prev, next } pagination links
getAllContent(); // Every entry across all types
```

Each entry contains: `slug`, `type`, `thumbnail`, `component`, `metadata`, `structuredData`, `readingTime`.

**Detail pages** use `getPostDetailProps(type, slug)` from `lib/getPostDetailProps.ts` + `PostDetailLayout` — a ~35-line pattern shared by all content types.

**Listing pages** use `getContentByType(type)` and map entries to `PostCard` props. Blog and projects listing pages wrap the grid in client islands (`BlogSearchAndList`, `ProjectsGridWithTags`) that support client-side tag filtering. Tag chips toggle an inline filter (with `aria-pressed` state); selecting a tag clears search and vice versa. Pagination hides while a filter is active. The existing `/blog/tags/{slug}` and `/projects/tags/{slug}` server routes remain as canonical SEO URLs.

## Content Ordering

Display order is the **`order`** field in each post's MDX `metadata`. The registry (`data/contentRegistry.ts`) sorts every type ascending by it, with the slug as a stable tie-breaker. There is no separate order file.

- Values are **sparse multiples of 10** (10, 20, 30, …) so a new post can slot between two existing ones without renumbering — to place a post between `order: 40` and `order: 50`, give it `45`.
- `order` is decoupled from `date` on purpose: `date` stays an honest publish/work date (it feeds JSON-LD `datePublished` and the visible date), while `order` encodes curated display position. Several projects share a `date` but each gets a distinct `order`.
- **`order` must be unique within a type.** A duplicate (or missing) value fails the build — asserted in `contentRegistry.ts` and in the registry unit test (`data/__tests__/contentRegistry.spec.ts`), which also prints the full resolved per-type order.
- Convention: projects ascend oldest→newest by the chronology of the work (newest renders last); experience ascends by employment start date; blog ascends by publish date.

## Adding a New Post

MDX is the single source of truth for every content field that appears on the site — thumbnail title, excerpt, cover image, SEO, OG images, and structured data all derive from the same `export const metadata` block.

1. Create the `.mdx` file with an `export const metadata` block including the `order` field (display position — see Content Ordering) and the `cover` field (see format below).
2. Add the slug constant to `data/project.ts`, `data/experience.ts`, or `data/blog.ts`. (This array's order is separate from display `order`: it backs the `Allowed*Slugs` type, the About page list, and the structured-data `ItemList`s.)
3. For **experience** entries only: also add a hand-authored `ExperienceStructuredData` entry in `data/structuredData/experience.ts` (the `Role`/`worksFor` shape). Blog and project structured data are auto-derived from MDX metadata — no manual step.

> The component/metadata import maps in `data/content/{type}/index.ts` are **generated automatically** from the `.mdx` files by `scripts/generate-content-registry.ts` (runs on `pnpm install` via `postinstall` and as an Nx dependency of `build`/`test`). You no longer hand-edit those maps — drop the `.mdx` file and they regenerate. Output lives in the gitignored `data/generated/`.

The MDX `metadata` block must include at minimum:

```mdx
export const metadata = {
  title: 'Specific, outcome-driven title',
  date: 'YYYY-MM-DD',
  order: 500, // Display position within the type (ascending). Sparse *10s, unique.
  excerpt: 'One compelling sentence, ≤ 160 chars, no em dashes',
  author: 'Daniel Joffe',
  category: 'Category Name',
  tags: ['Tag1', 'Tag2'],
  slug: 'url-slug',
  type: 'blog', // or 'project' or 'experience'
  cover: {
    alt: 'Short accessible description of the image',
    src: '/photo-xxxxx',
    origin: 'https://unsplash.com/photos/<photo-permalink>',
    creator: '@unsplashHandle',
  },
  // Projects can also include: featured: true
  // Experience entries also require: company, role, duration, industry,
  //   logo, invert, and (optional) domain
};
```

## Thumbnail Images

- **Every post must have a unique cover image.** No two posts across any content type (blog, project, experience) may share the same Unsplash `src` photo ID. Before adding a thumbnail, grep the `data/content/` directory for the image ID (`rg "photo-<id>" apps/root/src/data/content`).
- Images come from Unsplash. The `src` field is the CDN path (e.g. `/photo-1555066931-4365d14bab8c`), `origin` is the Unsplash page URL, and `creator` is the photographer's handle.
- Choose images that visually relate to the post topic. Avoid generic "code on screen" images when a more specific visual is available.
- `cover` lives inside the MDX `metadata` export. There is no separate `*Thumbnails.ts` file — the `PostThumbnail` shape is derived at runtime via `data/buildThumbnail.ts`.
