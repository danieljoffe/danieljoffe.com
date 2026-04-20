export type Difficulty = 'easy' | 'moderate' | 'hard';
export type ViolationCategory = 'performance' | 'accessibility' | 'seo' | 'ux';

export interface ViolationGuide {
  slug: string;
  title: string;
  difficulty: Difficulty;
  category: ViolationCategory;
  description: string;
  impact: string;
  solution: string;
  codeExample: {
    before: string | null;
    after: string;
    language: string;
  } | null;
  resources: { label: string; url: string }[];
}

function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const guides: ViolationGuide[] = [
  {
    slug: 'render-blocking-resources',
    title: 'Render-blocking resources',
    difficulty: 'moderate',
    category: 'performance',
    description:
      'Resources like CSS and synchronous JavaScript in the <head> block the browser from rendering any content until they finish loading. Users see a blank screen while these files download and parse.',
    impact:
      'Directly increases First Contentful Paint (FCP) and Largest Contentful Paint (LCP). Every blocking resource adds network round-trip time before users see anything.',
    solution:
      'Inline critical CSS for above-the-fold content, defer non-critical stylesheets with media queries or preload hints, and add async or defer to scripts that do not need to run before first paint.',
    codeExample: {
      before:
        '<link rel="stylesheet" href="/styles/full.css" />\n<script src="/analytics.js"></script>',
      after: `<!-- Critical CSS inlined -->
<style>
  /* above-the-fold styles only */
  .hero { display: flex; min-height: 100vh; }
</style>

<!-- Full stylesheet loaded asynchronously -->
<link rel="preload" href="/styles/full.css" as="style"
      onload="this.onload=null;this.rel='stylesheet'" />

<!-- Script deferred -->
<script src="/analytics.js" defer></script>`,
      language: 'html',
    },
    resources: [
      {
        label: 'web.dev: Eliminate render-blocking resources',
        url: 'https://web.dev/render-blocking-resources/',
      },
    ],
  },
  {
    slug: 'properly-size-images',
    title: 'Properly size images',
    difficulty: 'easy',
    category: 'performance',
    description:
      'Images served at dimensions larger than their rendered size waste bandwidth. The browser downloads a 2000px-wide image only to display it at 400px.',
    impact:
      'Oversized images are often the single largest payload on a page. Fixing this can reduce page weight by 50% or more, directly improving LCP and Time to Interactive.',
    solution:
      'Use responsive images with srcset and sizes attributes, or a framework image component (like next/image) that serves correctly-sized variants automatically.',
    codeExample: {
      before: '<img src="/hero-2000w.jpg" alt="Hero" />',
      after: `<img
  src="/hero-800w.jpg"
  srcset="/hero-400w.jpg 400w,
         /hero-800w.jpg 800w,
         /hero-1200w.jpg 1200w"
  sizes="(max-width: 768px) 100vw, 800px"
  alt="Hero"
/>`,
      language: 'html',
    },
    resources: [
      {
        label: 'web.dev: Serve responsive images',
        url: 'https://web.dev/serve-responsive-images/',
      },
    ],
  },
  {
    slug: 'unused-javascript',
    title: 'Unused JavaScript',
    difficulty: 'moderate',
    category: 'performance',
    description:
      'JavaScript that is downloaded but never executed on the current page wastes bandwidth and blocks the main thread during parsing. Common culprits: analytics bundles loaded on every page, feature flags for routes the user never visits, and third-party widgets.',
    impact:
      'Unused JS increases Total Blocking Time (TBT) and Time to Interactive (TTI). Every KB of JavaScript costs more than a KB of an image because it must be parsed and compiled.',
    solution:
      'Code-split by route, lazy-load components below the fold, audit third-party scripts, and use tree-shaking to eliminate dead exports.',
    codeExample: {
      before:
        "import { Chart } from 'chart-library'; // 80KB, only used on /dashboard",
      after: `import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('chart-library').then(m => m.Chart), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse bg-muted rounded" />,
});`,
      language: 'tsx',
    },
    resources: [
      {
        label: 'web.dev: Remove unused JavaScript',
        url: 'https://web.dev/unused-javascript/',
      },
    ],
  },
  {
    slug: 'efficient-cache-policy',
    title: 'Serve static assets with an efficient cache policy',
    difficulty: 'easy',
    category: 'performance',
    description:
      'Static assets (fonts, images, JS, CSS) without proper Cache-Control headers are re-downloaded on every visit. The browser cannot reuse what it already has.',
    impact:
      'Repeat visitors download the same files again, wasting bandwidth and slowing page loads. Proper caching makes return visits nearly instant.',
    solution:
      'Set long max-age values for hashed/fingerprinted assets (1 year). Use shorter durations for HTML and API responses. Most frameworks handle this automatically for build output.',
    codeExample: {
      before: 'Cache-Control: no-cache',
      after: `# Hashed assets (JS, CSS, images with content hash in filename)
Cache-Control: public, max-age=31536000, immutable

# HTML pages
Cache-Control: public, max-age=0, must-revalidate

# API responses
Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`,
      language: 'text',
    },
    resources: [
      {
        label: 'web.dev: HTTP caching',
        url: 'https://web.dev/http-cache/',
      },
    ],
  },
  {
    slug: 'image-format-optimization',
    title: 'Serve images in next-gen formats',
    difficulty: 'easy',
    category: 'performance',
    description:
      'JPEG and PNG are legacy formats. WebP and AVIF provide the same visual quality at 25-50% smaller file sizes through modern compression algorithms.',
    impact:
      'Switching from JPEG/PNG to WebP or AVIF often saves hundreds of KB per page, directly improving LCP and reducing data costs for mobile users.',
    solution:
      'Use a <picture> element with WebP/AVIF sources and a JPEG fallback, or use a framework image component that handles format negotiation via Accept headers.',
    codeExample: {
      before: '<img src="/photo.jpg" alt="Team photo" />',
      after: `<picture>
  <source srcset="/photo.avif" type="image/avif" />
  <source srcset="/photo.webp" type="image/webp" />
  <img src="/photo.jpg" alt="Team photo" />
</picture>`,
      language: 'html',
    },
    resources: [
      {
        label: 'web.dev: Use WebP images',
        url: 'https://web.dev/serve-images-webp/',
      },
    ],
  },
  {
    slug: 'missing-alt-text',
    title: 'Image elements do not have [alt] attributes',
    difficulty: 'easy',
    category: 'accessibility',
    description:
      'Images without alt attributes are invisible to screen readers. Users who cannot see the image get no information about what it contains or why it is there.',
    impact:
      'Fails WCAG 2.1 Level A (Success Criterion 1.1.1). Screen reader users hear "image" with no context. Also hurts SEO since search engines use alt text for image indexing.',
    solution:
      'Add descriptive alt text to informative images. Use alt="" (empty string) for purely decorative images so screen readers skip them entirely.',
    codeExample: {
      before: '<img src="/chart.png" />\n<img src="/decorative-swirl.svg" />',
      after: `<!-- Informative image: describe what it shows -->
<img src="/chart.png" alt="Revenue grew 40% from Q1 to Q4 2025" />

<!-- Decorative image: empty alt to skip -->
<img src="/decorative-swirl.svg" alt="" />`,
      language: 'html',
    },
    resources: [
      {
        label: 'WCAG 1.1.1: Non-text Content',
        url: 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html',
      },
    ],
  },
  {
    slug: 'color-contrast',
    title:
      'Background and foreground colors do not have a sufficient contrast ratio',
    difficulty: 'easy',
    category: 'accessibility',
    description:
      'Text that does not meet minimum contrast ratios against its background is hard to read for users with low vision, color blindness, or anyone in bright sunlight.',
    impact:
      'Fails WCAG 2.1 Level AA (Success Criterion 1.4.3). Minimum ratios: 4.5:1 for normal text, 3:1 for large text (18px+ bold or 24px+ regular).',
    solution:
      'Adjust text or background colors to meet the required ratio. Use design tokens with pre-validated contrast pairs. Test with a contrast checker.',
    codeExample: {
      before:
        '/* Gray text on light gray: ratio 2.5:1 — fails */\n.subtitle { color: #999; background: #f5f5f5; }',
      after: `/* Darker gray on light background: ratio 4.6:1 — passes */
.subtitle { color: #595959; background: #f5f5f5; }`,
      language: 'css',
    },
    resources: [
      {
        label: 'WebAIM Contrast Checker',
        url: 'https://webaim.org/resources/contrastchecker/',
      },
    ],
  },
  {
    slug: 'missing-meta-description',
    title: 'Document does not have a meta description',
    difficulty: 'easy',
    category: 'seo',
    description:
      'The meta description provides a summary of the page content that search engines display in results. Without it, search engines auto-generate a snippet from page content, which is often less compelling.',
    impact:
      'Pages without meta descriptions typically have lower click-through rates in search results. The auto-generated snippet may not represent the page well.',
    solution:
      'Add a unique, compelling meta description to every page. Keep it under 160 characters. Include relevant keywords naturally.',
    codeExample: {
      before: '<head>\n  <title>My Page</title>\n</head>',
      after: `<head>
  <title>My Page</title>
  <meta
    name="description"
    content="A concise summary of the page content, under 160 characters, that compels users to click."
  />
</head>`,
      language: 'html',
    },
    resources: [
      {
        label: 'Google: Control your snippets in search results',
        url: 'https://developers.google.com/search/docs/appearance/snippet',
      },
    ],
  },
  {
    slug: 'document-title',
    title: 'Document does not have a <title> element',
    difficulty: 'easy',
    category: 'seo',
    description:
      'The <title> element defines what appears in browser tabs, bookmarks, and search engine results. Without it, browsers show the URL and search engines may not index the page well.',
    impact:
      'Missing titles reduce search visibility and make the page unidentifiable in browser tabs. One of the most fundamental SEO requirements.',
    solution:
      'Add a unique, descriptive <title> to every page. In Next.js, export a metadata object or use generateMetadata.',
    codeExample: {
      before: '<head>\n  <!-- no title -->\n</head>',
      after: `// Next.js App Router
export const metadata = {
  title: 'Free Website Performance Audit | Daniel Joffe',
};`,
      language: 'tsx',
    },
    resources: [
      {
        label: 'web.dev: Document has a title element',
        url: 'https://web.dev/document-title/',
      },
    ],
  },
  {
    slug: 'link-text',
    title: 'Links do not have descriptive text',
    difficulty: 'easy',
    category: 'accessibility',
    description:
      'Links with generic text like "click here" or "read more" provide no context when read out of the visual layout. Screen reader users often navigate by listing all links on a page.',
    impact:
      'Fails WCAG 2.1 Level A (Success Criterion 2.4.4). A list of links reading "click here, click here, click here" is useless for navigation.',
    solution:
      'Make link text describe the destination or action. If the visual design requires short text, use aria-label to provide fuller context.',
    codeExample: {
      before: '<a href="/report">Click here</a> to view your report.',
      after: '<a href="/report">View your audit report</a>',
      language: 'html',
    },
    resources: [
      {
        label: 'WCAG 2.4.4: Link Purpose',
        url: 'https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context.html',
      },
    ],
  },
  {
    slug: 'heading-order',
    title: 'Heading elements are not in a sequentially-descending order',
    difficulty: 'easy',
    category: 'accessibility',
    description:
      'Headings that skip levels (e.g., h1 followed by h3) break the document outline. Screen reader users rely on heading hierarchy to understand page structure and navigate between sections.',
    impact:
      'A broken heading hierarchy makes it hard for assistive technology users to understand the relationship between sections. Also a minor SEO signal.',
    solution:
      'Use headings in sequential order: h1 → h2 → h3. Never skip a level. Use CSS to control visual size independently of semantic level.',
    codeExample: {
      before:
        '<h1>Page Title</h1>\n<h3>Section</h3>  <!-- skipped h2 -->\n<h5>Subsection</h5>  <!-- skipped h4 -->',
      after: `<h1>Page Title</h1>
<h2>Section</h2>
<h3>Subsection</h3>`,
      language: 'html',
    },
    resources: [
      {
        label: 'web.dev: Headings and landmarks',
        url: 'https://web.dev/headings-and-landmarks/',
      },
    ],
  },
  {
    slug: 'tap-targets',
    title: 'Tap targets are not sized appropriately',
    difficulty: 'moderate',
    category: 'ux',
    description:
      'Interactive elements (buttons, links, form inputs) that are too small or too close together cause mis-taps on mobile devices. Users with motor impairments are disproportionately affected.',
    impact:
      'Frustrates mobile users and fails accessibility guidelines. Google uses tap target sizing as a mobile usability signal in search ranking.',
    solution:
      'Ensure tap targets are at least 48x48 CSS pixels with at least 8px of spacing between adjacent targets. Use padding rather than just the content area.',
    codeExample: {
      before: '.nav-link { padding: 4px 8px; font-size: 12px; }',
      after: `/* Minimum 48px touch target via padding */
.nav-link {
  padding: 12px 16px;
  font-size: 14px;
  min-height: 48px;
  display: inline-flex;
  align-items: center;
}`,
      language: 'css',
    },
    resources: [
      {
        label: 'web.dev: Tap targets',
        url: 'https://web.dev/tap-targets/',
      },
    ],
  },
  {
    slug: 'font-display',
    title: 'Ensure text remains visible during webfont load',
    difficulty: 'easy',
    category: 'performance',
    description:
      'Custom web fonts that block text rendering cause a "flash of invisible text" (FOIT). Users see a blank page until the font downloads, which can take seconds on slow connections.',
    impact:
      'Directly delays First Contentful Paint. Users on slow connections may wait 3+ seconds seeing no text at all.',
    solution:
      'Add font-display: swap to @font-face declarations. This shows text immediately in a fallback font, then swaps to the custom font once loaded.',
    codeExample: {
      before:
        "@font-face {\n  font-family: 'Brand';\n  src: url('/fonts/brand.woff2') format('woff2');\n}",
      after: `@font-face {
  font-family: 'Brand';
  src: url('/fonts/brand.woff2') format('woff2');
  font-display: swap;
}`,
      language: 'css',
    },
    resources: [
      {
        label: 'web.dev: font-display',
        url: 'https://web.dev/font-display/',
      },
    ],
  },
  {
    slug: 'viewport-meta',
    title:
      'Does not have a <meta name="viewport"> tag with width or initial-scale',
    difficulty: 'easy',
    category: 'ux',
    description:
      'Without a viewport meta tag, mobile browsers render the page at a desktop width (typically 980px) and then scale it down. Text is tiny, and users must pinch-zoom to read anything.',
    impact:
      'The page is essentially unusable on mobile without zooming. Google will flag this as not mobile-friendly, which directly impacts mobile search ranking.',
    solution:
      'Add the viewport meta tag to the <head>. Most frameworks include this by default.',
    codeExample: {
      before: '<head>\n  <!-- no viewport tag -->\n</head>',
      after:
        '<meta name="viewport" content="width=device-width, initial-scale=1" />',
      language: 'html',
    },
    resources: [
      {
        label: 'web.dev: Viewport meta tag',
        url: 'https://web.dev/viewport/',
      },
    ],
  },
  {
    slug: 'largest-contentful-paint',
    title: 'Largest Contentful Paint element took too long to render',
    difficulty: 'hard',
    category: 'performance',
    description:
      'Largest Contentful Paint (LCP) measures when the biggest visible element (usually a hero image or heading) finishes rendering. An LCP over 2.5 seconds means users perceive the page as slow.',
    impact:
      'LCP is a Core Web Vital and a Google ranking factor. Poor LCP correlates with higher bounce rates: users leave before the page appears loaded.',
    solution:
      'Identify the LCP element (usually a hero image or large heading). Optimize its loading path: preload the image, inline critical CSS, eliminate render-blocking resources before it, and ensure the server responds quickly (TTFB under 800ms).',
    codeExample: {
      before:
        '<!-- Hero image discovered late by the browser -->\n<img src="/hero.webp" alt="Hero" />',
      after: `<!-- Preload the LCP image so the browser fetches it immediately -->
<link rel="preload" as="image" href="/hero.webp" type="image/webp" />

<!-- Use fetchpriority to prioritize it over other images -->
<img src="/hero.webp" alt="Hero" fetchpriority="high" />`,
      language: 'html',
    },
    resources: [
      {
        label: 'web.dev: Optimize LCP',
        url: 'https://web.dev/optimize-lcp/',
      },
    ],
  },
];

/** Map violation titles to their guide slugs for lookup. */
const titleIndex = new Map<string, string>();
guides.forEach(g => titleIndex.set(g.title.toLowerCase(), g.slug));

/** Get all guides (for generateStaticParams). */
export function getAllViolationGuides(): ViolationGuide[] {
  return guides;
}

/** Get a single guide by slug. */
export function getViolationGuideBySlug(
  slug: string
): ViolationGuide | undefined {
  return guides.find(g => g.slug === slug);
}

/** Check if a violation title has a corresponding guide. Returns the slug or null. */
export function getViolationSlug(title: string): string | null {
  return titleIndex.get(title.toLowerCase()) ?? null;
}

/** Generate a slug from any title (for consistent URL generation). */
export { titleToSlug };
