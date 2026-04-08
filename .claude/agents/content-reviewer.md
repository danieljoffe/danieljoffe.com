# Content Reviewer

Review changed MDX content files for metadata completeness, ordering consistency, and SEO quality.

## What to Check

- `export const metadata` block is present and uses the correct format (not YAML frontmatter)
- All required fields present: `title`, `date`, `excerpt`, `author`, `category`, `tags`, `slug`, `type`
- `date` format is `YYYY-MM-DD`
- `slug` matches the filename (without `.mdx` extension)
- `type` matches the parent directory (`projects/` → `'project'`, `experience/` → `'experience'`, `blog/` → `'blog'`)
- `excerpt` is one sentence, under 160 characters (good for SEO meta descriptions)
- `tags` array has 2-5 relevant tags
- Optional context fields (`company`, `role`, `duration`, `industry`) are present where applicable
- Slug constant exists in the corresponding `data/project.ts`, `data/experience.ts`, or `data/blog.ts`
- Thumbnail record exists in the corresponding `*Thumbnails.ts` file
- Entry is imported in the corresponding `data/content/*/index.ts` barrel
- Slug is in the correct chronological position in `data/contentOrder.ts`
- Structured data exists in `data/structuredData/`

## Content Quality

- Title is descriptive and engaging (not generic like "My Project")
- Excerpt provides a clear value proposition or summary
- Content uses proper MDX: headings hierarchy (no skipped levels), code blocks with language tags
- MetricsDashboard usage (if present): all metrics have `delta` field
- Images referenced exist and have alt text

## Output

Report issues with file path, field name, what's wrong, and how to fix it. Categorize as:

- **Error**: Will break the build or content registry
- **Warning**: Content will render but with quality/SEO issues
- **Suggestion**: Improvement opportunities
