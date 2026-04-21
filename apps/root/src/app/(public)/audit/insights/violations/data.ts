export type Difficulty = 'easy' | 'moderate' | 'complex';
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

/* ---------------------------------------------------------------------------
 * Guides are ordered: performance → accessibility → seo → ux.
 *
 * Titles for the first 22 entries match the human-friendly titles produced by
 * the audit-api (apps/audit-api/app/services/issue_mappings.py). This is what
 * makes getViolationSlug() work — the lookup is by exact title.
 *
 * The remaining 5 entries have no 1:1 mapping in issue_mappings.py but are
 * kept as standalone SEO guide pages.
 * --------------------------------------------------------------------------- */
const guides: ViolationGuide[] = [
  // ── Performance (scan-mapped) ──────────────────────────────────────────

  {
    slug: 'largest-contentful-paint',
    title: 'Main content takes too long to appear',
    difficulty: 'complex',
    category: 'performance',
    description:
      "Your page's main content (like the hero image or headline) is taking too long to show up. Visitors expect to see something meaningful within 2.5 seconds. If it takes longer, they'll assume the site is broken and leave.",
    impact:
      "Google uses this as a ranking factor. Sites that are slow to show content lose up to 25% of visitors before they ever see what's on the page.",
    solution:
      'Find the biggest element on your page (usually a large image or heading). Make sure the browser can load it as fast as possible: preload the image so the browser starts downloading it immediately, and remove anything that blocks it from appearing (like large CSS or JS files in the way).',
    codeExample: {
      before:
        '<!-- Browser doesn\'t know about this image until it parses the HTML -->\n<img src="/hero.webp" alt="Hero" />',
      after: `<!-- Tell the browser to start downloading the image right away -->
<link rel="preload" as="image" href="/hero.webp" type="image/webp" />

<!-- Mark it as high priority so it loads before other images -->
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
  {
    slug: 'first-contentful-paint',
    title: 'Page is slow to show anything',
    difficulty: 'moderate',
    category: 'performance',
    description:
      'When someone visits your page, they see a blank white screen for too long before anything appears. Even a loading spinner or some text would help, but right now the browser is stuck downloading files before it can show anything at all.',
    impact:
      'Every extra second of staring at a blank screen makes it 32% more likely someone will hit the back button. On a phone with a slower connection, it feels even worse.',
    solution:
      "The fix is to let the browser show something quickly while it loads the rest. Put your most important styles directly in the HTML (instead of a separate file), delay loading JavaScript that isn't needed right away, and make sure your server responds fast.",
    codeExample: {
      before:
        '<!-- Browser must download BOTH of these before showing anything -->\n<link rel="stylesheet" href="/styles/full.css" />\n<script src="/app.js"></script>',
      after: `<!-- Put essential styles right in the HTML -->
<style>
  body { font-family: system-ui, sans-serif; }
  .hero { min-height: 100vh; display: flex; }
</style>

<!-- Load the full stylesheet in the background -->
<link rel="preload" href="/styles/full.css" as="style"
      onload="this.onload=null;this.rel='stylesheet'" />

<!-- Let the page show before running this script -->
<script src="/app.js" defer></script>`,
      language: 'html',
    },
    resources: [
      {
        label: 'web.dev: First Contentful Paint',
        url: 'https://web.dev/fcp/',
      },
    ],
  },
  {
    slug: 'total-blocking-time',
    title: 'Page freezes during load',
    difficulty: 'complex',
    category: 'performance',
    description:
      "Your page looks like it's loaded, but when visitors try to click a button, scroll, or type — nothing happens. The browser is busy running JavaScript and can't respond to anything until it's done.",
    impact:
      "This makes your site feel broken, especially on phones. People will tap a button multiple times thinking it didn't register, or just give up and leave.",
    solution:
      'Break up large chunks of JavaScript into smaller pieces so the browser can respond to user actions in between. Think of it like a conversation: instead of one person talking for 5 minutes straight, take turns.',
    codeExample: {
      before: `// Everything runs at once — browser can't respond for 300ms
function initPage() {
  parseData();       // 120ms
  buildDOM();        // 100ms
  attachListeners(); // 80ms
}
initPage();`,
      after: `// Break into steps — browser can respond between each one
async function initPage() {
  parseData();
  await scheduler.yield(); // pause so browser can handle clicks
  buildDOM();
  await scheduler.yield();
  attachListeners();
}
initPage();`,
      language: 'javascript',
    },
    resources: [
      {
        label: 'web.dev: Total Blocking Time',
        url: 'https://web.dev/tbt/',
      },
    ],
  },
  {
    slug: 'cumulative-layout-shift',
    title: 'Content shifts around while loading',
    difficulty: 'easy',
    category: 'performance',
    description:
      'Things on your page jump around as it loads. You might be reading text when suddenly an image pops in and pushes everything down. Or you go to tap a button and it moves right as you reach it, causing you to click the wrong thing.',
    impact:
      'This is one of the most frustrating user experiences on the web. Google tracks it and uses it to rank your site. The usual culprits are images without set dimensions, ads that load late, or fonts that change text size.',
    solution:
      'The simplest fix: always tell the browser how big images and videos will be before they load. That way it can reserve the right amount of space and nothing jumps when the content appears.',
    codeExample: {
      before:
        '<!-- Browser doesn\'t know how tall this will be -->\n<img src="/hero.jpg" alt="Hero" />',
      after: `<!-- Browser reserves exact space before the image loads -->
<img src="/hero.jpg" alt="Hero" width="1200" height="630" />

<!-- Or use aspect-ratio for responsive layouts -->
<img src="/hero.jpg" alt="Hero"
     style="aspect-ratio: 1200/630; width: 100%; height: auto;" />`,
      language: 'html',
    },
    resources: [
      {
        label: 'web.dev: Optimize CLS',
        url: 'https://web.dev/optimize-cls/',
      },
    ],
  },
  {
    slug: 'speed-index',
    title: 'Page feels slow to visually complete',
    difficulty: 'moderate',
    category: 'performance',
    description:
      'Your page loads in chunks — first some text appears, then a big blank gap, then more content pops in, then images load one by one. Instead of feeling smooth and fast, the experience feels jerky and incomplete.',
    impact:
      'Even if your total load time is decent, a page that fills in slowly feels worse than one that shows everything at once. Visitors compare the experience to other sites they use daily.',
    solution:
      "Prioritize what's visible first (above the fold). Load images and content that visitors see immediately before anything else. Defer everything below the scroll line until they actually need it.",
    codeExample: null,
    resources: [
      {
        label: 'web.dev: Speed Index',
        url: 'https://web.dev/speed-index/',
      },
    ],
  },
  {
    slug: 'render-blocking-resources',
    title: 'Files are blocking your page from loading',
    difficulty: 'moderate',
    category: 'performance',
    description:
      'Your page has CSS and JavaScript files that the browser insists on downloading completely before it will show anything on screen. While those files download, visitors see nothing but a white page.',
    impact:
      'Each blocking file adds anywhere from half a second to several seconds of blank-screen time, depending on file size and connection speed. Removing them can make your page appear 1-3 seconds faster.',
    solution:
      "Put your most critical styles (just enough to style what's visible without scrolling) directly in the HTML. Load everything else in the background. For scripts, add 'defer' so they run after the page appears.",
    codeExample: {
      before:
        '<!-- Both of these block the page from showing anything -->\n<link rel="stylesheet" href="/styles/full.css" />\n<script src="/analytics.js"></script>',
      after: `<!-- Only the essential styles, right in the HTML -->
<style>
  .hero { display: flex; min-height: 100vh; }
</style>

<!-- Full styles load in the background -->
<link rel="preload" href="/styles/full.css" as="style"
      onload="this.onload=null;this.rel='stylesheet'" />

<!-- Script runs after the page appears -->
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
    slug: 'uses-optimized-images',
    title: "Images aren't compressed",
    difficulty: 'easy',
    category: 'performance',
    description:
      "Your images are much larger than they need to be. Modern compression can shrink them by 30-50% without any visible difference in quality. Right now, visitors are downloading megabytes of image data they don't need.",
    impact:
      'Uncompressed images are the #1 reason pages load slowly. Fixing this alone can cut your page load time in half, especially on mobile where data connections are slower.',
    solution:
      'Convert images to modern formats like WebP or AVIF (they look the same but are much smaller). If you use a framework like Next.js, its Image component handles this automatically.',
    codeExample: {
      before:
        '<!-- Old format, large file size -->\n<img src="/photo.jpg" alt="Team photo" />',
      after: `<!-- Serve modern formats with a fallback -->
<picture>
  <source srcset="/photo.avif" type="image/avif" />
  <source srcset="/photo.webp" type="image/webp" />
  <img src="/photo.jpg" alt="Team photo" />
</picture>`,
      language: 'html',
    },
    resources: [
      {
        label: 'web.dev: Use optimized images',
        url: 'https://web.dev/uses-optimized-images/',
      },
    ],
  },
  {
    slug: 'uses-responsive-images',
    title: 'Mobile users are downloading desktop-sized images',
    difficulty: 'easy',
    category: 'performance',
    description:
      "You're serving the same massive images to phones as you do to desktop monitors. A phone with a 400px-wide screen is downloading images meant for a 2000px display — that's 4x more data than needed.",
    impact:
      "This wastes your visitors' mobile data and makes your site load much slower on phones. Fixing it can cut mobile data usage by more than half.",
    solution:
      'Provide multiple sizes of each image and let the browser pick the right one for the screen. Modern frameworks (like Next.js Image) do this automatically.',
    codeExample: {
      before:
        '<!-- Same huge image for every device -->\n<img src="/hero-2000w.jpg" alt="Hero" />',
      after: `<!-- Browser picks the right size for the screen -->
<img
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
    slug: 'offscreen-images',
    title: 'Images load before users scroll to them',
    difficulty: 'easy',
    category: 'performance',
    description:
      "All images on your page start downloading the moment someone visits, even ones way below the screen that they haven't scrolled to yet. This slows down the images they can actually see.",
    impact:
      "Loading images people haven't scrolled to yet wastes bandwidth and slows down the stuff at the top of the page. Deferring them can reduce your initial page weight by 30-60%.",
    solution:
      'Add loading="lazy" to images below the fold. The browser will only download them when the visitor scrolls near them. Just don\'t lazy-load your hero image at the top — that one should load immediately.',
    codeExample: {
      before:
        '<!-- All images load at once, even ones below the screen -->\n<img src="/hero.jpg" alt="Hero" />\n<img src="/feature-1.jpg" alt="Feature" />\n<img src="/feature-2.jpg" alt="Feature" />',
      after: `<!-- Hero loads immediately (visible on screen) -->
<img src="/hero.jpg" alt="Hero" fetchpriority="high" />

<!-- These only load when scrolled into view -->
<img src="/feature-1.jpg" alt="Feature" loading="lazy" />
<img src="/feature-2.jpg" alt="Feature" loading="lazy" />`,
      language: 'html',
    },
    resources: [
      {
        label: 'web.dev: Lazy-load offscreen images',
        url: 'https://web.dev/offscreen-images/',
      },
    ],
  },
  {
    slug: 'uses-text-compression',
    title: "Text content isn't compressed",
    difficulty: 'easy',
    category: 'performance',
    description:
      "Your server is sending HTML, CSS, and JavaScript as raw text without compressing it first. It's like mailing a document without folding it — it takes up way more space than it needs to.",
    impact:
      "Enabling compression shrinks text files by 60-80%. It's one of the easiest performance wins: a one-time server config change that speeds up every page load.",
    solution:
      "Enable gzip or Brotli compression on your server or hosting platform. Most modern hosts (Vercel, Netlify, Cloudflare) do this by default. If you self-host, it's a quick config change.",
    codeExample: {
      before:
        '# No compression — files sent at full size\n# A 100KB JavaScript file transfers as 100KB',
      after: `# Enable gzip compression in Nginx
gzip on;
gzip_types text/plain text/css application/json
           application/javascript text/xml;
gzip_min_length 256;

# Result: that 100KB file now transfers as ~25KB`,
      language: 'bash',
    },
    resources: [
      {
        label: 'web.dev: Enable text compression',
        url: 'https://web.dev/uses-text-compression/',
      },
    ],
  },
  {
    slug: 'unminified-css',
    title: 'CSS files contain unnecessary whitespace',
    difficulty: 'easy',
    category: 'performance',
    description:
      "Your CSS files still have all the spaces, line breaks, and comments that developers use to read the code. Visitors' browsers don't need any of that — it just makes the files bigger and slower to download.",
    impact:
      'Minifying CSS is free performance. Your build tool removes the whitespace automatically, making files smaller without any downside. Most modern frameworks do this by default in production.',
    solution:
      'Make sure your build process includes CSS minification. If you use Next.js, Vite, or similar tools, this happens automatically when you build for production. If not, add a tool like cssnano or Lightning CSS to your build.',
    codeExample: {
      before: `/* Navigation styles */
.nav {
  display: flex;
  gap: 1rem;
  padding: 1rem 2rem;
}`,
      after:
        '/* Same styles, ~40% smaller file */\n.nav{display:flex;gap:1rem;padding:1rem 2rem}',
      language: 'css',
    },
    resources: [
      {
        label: 'web.dev: Minify CSS',
        url: 'https://web.dev/unminified-css/',
      },
    ],
  },
  {
    slug: 'unminified-javascript',
    title: "JavaScript files aren't minified",
    difficulty: 'easy',
    category: 'performance',
    description:
      "Your JavaScript files contain long variable names, comments, and formatting that help developers read the code — but visitors' browsers don't need any of it. Removing it makes the files smaller and faster to download.",
    impact:
      'Minified JavaScript loads faster and also parses faster (the browser has less text to read through). Most build tools handle this automatically.',
    solution:
      'Make sure your production build minifies JavaScript. Tools like Next.js, Vite, and webpack do this by default. If you see unminified JS in production, check your build configuration.',
    codeExample: {
      before: `// Calculate the total price including tax
function calculateTotalPrice(items, taxRate) {
  const subtotal = items.reduce(
    (sum, item) => sum + item.price,
    0
  );
  return subtotal * (1 + taxRate);
}`,
      after:
        '// Same function, much smaller\nfunction calculateTotalPrice(e,t){return e.reduce((e,t)=>e+t.price,0)*(1+t)}',
      language: 'javascript',
    },
    resources: [
      {
        label: 'web.dev: Minify JavaScript',
        url: 'https://web.dev/unminified-javascript/',
      },
    ],
  },

  // ── Accessibility (scan-mapped) ────────────────────────────────────────

  {
    slug: 'color-contrast',
    title: 'Some text is hard to read',
    difficulty: 'easy',
    category: 'accessibility',
    description:
      "Some text on your page doesn't stand out enough from its background. Light gray text on a white background, for example, is hard to read for everyone — and nearly impossible for people with low vision or color blindness.",
    impact:
      'About 15% of people have some form of visual impairment. Low-contrast text also hurts everyone in bright sunlight or on dim screens. Search engines penalize sites with accessibility issues.',
    solution:
      'Make text darker (or backgrounds lighter) until the contrast ratio is at least 4.5:1 for normal text and 3:1 for large text. Use a free contrast checker tool to test your color combinations.',
    codeExample: {
      before:
        '/* Light gray on white — too hard to read (ratio: 2.5:1) */\n.subtitle { color: #999; background: #f5f5f5; }',
      after: `/* Darker gray — easy to read (ratio: 4.6:1) */
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
    slug: 'image-alt',
    title: 'Images are missing descriptions',
    difficulty: 'easy',
    category: 'accessibility',
    description:
      "Some images on your page don't have text descriptions (alt text). This means people using screen readers have no idea what those images show. It also means search engines can't understand your images.",
    impact:
      "Screen reader users hear 'image' with no context — they have no way to know what they're missing. Google also uses alt text to understand and rank images in search results.",
    solution:
      'Add a short description to every meaningful image. If an image is purely decorative (like a background pattern), use an empty alt attribute so screen readers skip it.',
    codeExample: {
      before:
        '<!-- Screen reader says: "image" — no help at all -->\n<img src="/chart.png" />\n<img src="/decorative-swirl.svg" />',
      after: `<!-- Screen reader says: "Revenue grew 40% from Q1 to Q4" -->
<img src="/chart.png" alt="Revenue grew 40% from Q1 to Q4 2025" />

<!-- Screen reader skips this decorative image entirely -->
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
    slug: 'label',
    title: 'Form fields are missing labels',
    difficulty: 'easy',
    category: 'accessibility',
    description:
      "Some form fields on your page (like text inputs or dropdowns) don't have labels telling people what to type. Sighted users might figure it out from placeholder text or context, but screen reader users hear nothing — they don't know what's being asked.",
    impact:
      "Unlabeled forms are impossible to use for people relying on screen readers. Even for sighted users, clicking a label should focus the associated input — without the connection, this doesn't work.",
    solution:
      "Give every form field a visible label that clearly says what to enter. Connect the label to the input using the 'for' attribute matching the input's 'id'.",
    codeExample: {
      before:
        '<!-- What goes here? Screen readers can\'t tell -->\n<input type="email" placeholder="Email" />',
      after: `<!-- Clear label — works for everyone -->
<label for="email">Email address</label>
<input type="email" id="email" placeholder="you@example.com" />`,
      language: 'html',
    },
    resources: [
      {
        label: 'web.dev: Labels and text alternatives',
        url: 'https://web.dev/labels-and-text-alternatives/',
      },
    ],
  },
  {
    slug: 'heading-order',
    title: 'Heading levels are out of order',
    difficulty: 'easy',
    category: 'accessibility',
    description:
      "Your page jumps between heading sizes in a way that doesn't make logical sense — like going from a main title (H1) directly to a small subtitle (H3), skipping H2 entirely. This confuses screen readers that use headings as a table of contents.",
    impact:
      "Screen reader users navigate pages by jumping between headings. When the order is broken, it's like a book with chapter numbers that skip around — confusing and hard to follow.",
    solution:
      'Use headings in order: H1 for the page title, H2 for main sections, H3 for subsections within those. Never skip a level. If you want smaller visual text, use CSS for sizing instead of a lower heading level.',
    codeExample: {
      before:
        '<h1>Page Title</h1>\n<h3>Section</h3>  <!-- jumped from 1 to 3! -->\n<h5>Subsection</h5>  <!-- jumped from 3 to 5! -->',
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
    slug: 'link-name',
    title: "Links don't describe where they go",
    difficulty: 'easy',
    category: 'accessibility',
    description:
      'Some links on your page say things like "click here" or "read more" without explaining where they lead. Screen reader users often pull up a list of all links on a page — and a list full of "click here" is completely useless.',
    impact:
      'Vague link text hurts both accessibility and usability. Everyone benefits from knowing where a link will take them before clicking. It also helps search engines understand your page structure.',
    solution:
      'Make each link\'s text describe what you\'ll find when you click it. Instead of "click here to see your report," just make the link text say "View your audit report."',
    codeExample: {
      before:
        '<!-- Where does this go? Nobody knows -->\n<a href="/report">Click here</a> to view your report.',
      after:
        '<!-- Clear destination -->\n<a href="/report">View your audit report</a>',
      language: 'html',
    },
    resources: [
      {
        label: 'WCAG 2.4.4: Link Purpose',
        url: 'https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context.html',
      },
    ],
  },

  // ── SEO (scan-mapped) ─────────────────────────────────────────────────

  {
    slug: 'document-title',
    title: 'Page is missing a title',
    difficulty: 'easy',
    category: 'seo',
    description:
      "Your page doesn't have a title tag. The title is what shows up in the browser tab, in bookmarks, and as the clickable headline in Google search results. Without one, the browser just shows the URL.",
    impact:
      "No title means Google has nothing to display as your headline in search results. This dramatically reduces the chances anyone will click through to your site. It's one of the most basic SEO requirements.",
    solution:
      'Add a unique, descriptive title to every page. Keep it under 60 characters. Make it clear what the page is about.',
    codeExample: {
      before:
        '<head>\n  <!-- no title — browser shows the URL instead -->\n</head>',
      after: `// In Next.js, add this to your page file:
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
    slug: 'meta-description',
    title: 'Page is missing a meta description',
    difficulty: 'easy',
    category: 'seo',
    description:
      "Your page is missing the short summary that appears below the title in Google results. Without it, Google will grab a random snippet from your page — which usually doesn't look great or make people want to click.",
    impact:
      'Pages with a well-written description get about 6% more clicks from search results. That might not sound like much, but over thousands of searches it adds up significantly.',
    solution:
      'Write a short, compelling description (under 160 characters) for every page. Think of it as a mini advertisement — what would make someone want to click?',
    codeExample: {
      before:
        '<head>\n  <title>My Page</title>\n  <!-- no description — Google guesses -->\n</head>',
      after: `<head>
  <title>My Page</title>
  <meta
    name="description"
    content="A brief, compelling summary that makes people want to click. Keep it under 160 characters."
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
    slug: 'http-status-code',
    title: 'Page returns an error',
    difficulty: 'moderate',
    category: 'seo',
    description:
      'When someone (or Google) tries to load this page, the server responds with an error instead of the actual content. This might be a 404 (page not found) or a 500 (something went wrong on the server).',
    impact:
      "Google will stop showing error pages in search results. If this is a page that used to rank well, you're losing all that traffic until it's fixed.",
    solution:
      "Figure out what's causing the error. If the page moved, set up a redirect to the new location. If the page was deleted, either bring it back or redirect to the most relevant alternative. If it's a server error, check your server logs.",
    codeExample: {
      before:
        '# Page at /old-page returns 404\n# Visitors and Google get an error',
      after: `// next.config.js — redirect old URLs to their new home
module.exports = {
  async redirects() {
    return [
      {
        source: '/old-page',
        destination: '/new-page',
        permanent: true, // tells Google the move is permanent
      },
    ];
  },
};`,
      language: 'javascript',
    },
    resources: [
      {
        label: 'Google: HTTP errors and network issues',
        url: 'https://developers.google.com/search/docs/crawling-indexing/http-network-errors',
      },
    ],
  },
  {
    slug: 'is-crawlable',
    title: "Search engines can't find this page",
    difficulty: 'easy',
    category: 'seo',
    description:
      "Your page is telling search engines not to index it. This is sometimes intentional (for admin pages or staging sites), but if this is a public page you want people to find via Google, it's a problem.",
    impact:
      'A page blocked from crawling is completely invisible to search. No matter how good the content is, nobody will find it through Google, Bing, or any other search engine.',
    solution:
      "Check for a 'noindex' tag in your HTML or a robots.txt rule blocking the page. Remove it if the page should be public. Use Google Search Console's URL Inspection tool to verify Google can access it.",
    codeExample: {
      before:
        '<!-- This tells Google to ignore your page -->\n<meta name="robots" content="noindex, nofollow" />',
      after: `<!-- Remove the noindex tag, or explicitly allow indexing -->
<meta name="robots" content="index, follow" />

<!-- In Next.js, just don't add a robots field (defaults to indexable) -->
export const metadata = {
  title: 'My Public Page',
};`,
      language: 'html',
    },
    resources: [
      {
        label: 'Google: Robots meta tag',
        url: 'https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag',
      },
    ],
  },

  // ── UX (scan-mapped) ──────────────────────────────────────────────────

  {
    slug: 'viewport',
    title: "Page isn't configured for mobile",
    difficulty: 'easy',
    category: 'ux',
    description:
      'Your page is missing a small but critical piece of code that tells phones how to display it. Without it, mobile browsers render the page as if it were on a desktop monitor, then shrink everything down. The result: tiny unreadable text that requires pinch-zooming.',
    impact:
      "Over 60% of web traffic comes from phones. Without this fix, your page is essentially broken for the majority of visitors. Google also penalizes pages that aren't mobile-friendly in mobile search results.",
    solution:
      "Add one line to your HTML head. Most frameworks include this automatically, but if yours doesn't, it's a quick fix.",
    codeExample: {
      before:
        '<head>\n  <!-- missing viewport tag — page renders tiny on phones -->\n</head>',
      after: `<head>
  <!-- This one line makes your page work on mobile -->
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>`,
      language: 'html',
    },
    resources: [
      {
        label: 'web.dev: Viewport meta tag',
        url: 'https://web.dev/viewport/',
      },
    ],
  },

  // ── Standalone guides (no scan-mapped title) ──────────────────────────

  {
    slug: 'unused-javascript',
    title: 'Unused JavaScript',
    difficulty: 'moderate',
    category: 'performance',
    description:
      "Your page downloads JavaScript code that it never actually uses. Maybe it's an analytics library loaded on every page but only needed on one, or features for a section the visitor never sees. The browser still has to download and process all of it.",
    impact:
      'Unused JavaScript makes pages load slower and become interactive later. Unlike images, JavaScript must be parsed and compiled — so 100KB of unused JS costs more than 100KB of unused images.',
    solution:
      "Only load code when it's needed. Split your JavaScript by page (so the homepage doesn't download dashboard code). Lazy-load features that are below the fold or behind user interactions.",
    codeExample: {
      before:
        "// This 80KB chart library loads on EVERY page\nimport { Chart } from 'chart-library';",
      after: `// Only load the chart when someone visits the dashboard
import dynamic from 'next/dynamic';

const Chart = dynamic(
  () => import('chart-library').then(m => m.Chart),
  { ssr: false }
);`,
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
      "When someone visits your site a second time, their browser should remember the files it already downloaded (images, CSS, JavaScript). Right now it's re-downloading everything from scratch each time, as if the visitor had never been there before.",
    impact:
      'Proper caching makes return visits nearly instant — the browser uses saved files instead of downloading them again. Without it, every visit feels like the first one.',
    solution:
      'Tell browsers to save files for a long time (1 year for files with version hashes in their names). Most hosting platforms and frameworks handle this automatically.',
    codeExample: {
      before:
        '# Browser re-downloads everything every time\nCache-Control: no-cache',
      after: `# Files with hashes in the name (safe to cache forever)
Cache-Control: public, max-age=31536000, immutable

# HTML pages (always check for updates)
Cache-Control: public, max-age=0, must-revalidate`,
      language: 'bash',
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
      "Your images are in older formats (JPEG or PNG) when newer formats exist that look identical but are 25-50% smaller. It's like using a VHS tape when Blu-ray is available — same content, much less space.",
    impact:
      'Switching to modern formats (WebP or AVIF) often saves hundreds of KB per page. For image-heavy pages, this can cut load time significantly without any visual difference.',
    solution:
      'Use WebP or AVIF format for your images. You can provide fallbacks for older browsers using the <picture> element, or let a framework/CDN handle format negotiation automatically.',
    codeExample: {
      before:
        '<!-- Old format, large file -->\n<img src="/photo.jpg" alt="Team photo" />',
      after: `<!-- Modern formats with fallback for old browsers -->
<picture>
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
    slug: 'tap-targets',
    title: 'Tap targets are not sized appropriately',
    difficulty: 'moderate',
    category: 'ux',
    description:
      'Buttons and links on your page are too small or too close together for comfortable tapping on a phone. People end up hitting the wrong thing or having to zoom in to tap accurately.',
    impact:
      'Small tap targets frustrate mobile users and cause accidental clicks. Google flags this as a mobile usability problem that can affect your search ranking.',
    solution:
      "Make every tappable element at least 48x48 pixels (about the size of a fingertip). Add spacing between buttons so they're easy to tap individually. Use padding to increase the tap area without changing the visual size.",
    codeExample: {
      before:
        '/* Too small to tap comfortably on a phone */\n.nav-link { padding: 4px 8px; font-size: 12px; }',
      after: `/* Comfortable tap target (48px minimum) */
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
      'Your page uses a custom font that takes time to download. While it downloads, the text is completely invisible — visitors see a blank space where words should be. On slow connections, this can last several seconds.',
    impact:
      "Invisible text means visitors can't read anything while the font loads. This directly delays when people can start consuming your content.",
    solution:
      "Tell the browser to show text immediately using a fallback system font, then swap in the custom font once it's ready. Visitors see content instantly, and the font change is barely noticeable.",
    codeExample: {
      before:
        "/* Text is invisible until this font downloads */\n@font-face {\n  font-family: 'Brand';\n  src: url('/fonts/brand.woff2') format('woff2');\n}",
      after: `/* Text shows immediately in a fallback font, then swaps */
@font-face {
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
