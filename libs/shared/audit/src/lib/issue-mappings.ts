export interface IssueMapping {
  title: string;
  descriptionTemplate: string;
  impactTemplate: string;
  category: 'performance' | 'accessibility' | 'seo' | 'ux';
  fixDifficulty: 'easy' | 'moderate' | 'complex';
  severity: 'critical' | 'warning' | 'info';
}

export const LIGHTHOUSE_ISSUE_MAPPINGS: Record<string, IssueMapping> = {
  'largest-contentful-paint': {
    title: 'Main content takes too long to appear',
    descriptionTemplate:
      "Your page's primary content takes {value} to load. Users expect to see meaningful content within 2.5 seconds on mobile.",
    impactTemplate:
      'Pages with LCP over 4 seconds lose up to 25% of visitors before they see your content.',
    category: 'performance',
    fixDifficulty: 'moderate',
    severity: 'critical',
  },
  'first-contentful-paint': {
    title: 'Page is slow to show anything',
    descriptionTemplate:
      'It takes {value} before any content appears on screen. On slower mobile connections, this feels even longer.',
    impactTemplate:
      'Every second of delay in first paint increases bounce probability by 32%.',
    category: 'performance',
    fixDifficulty: 'moderate',
    severity: 'critical',
  },
  'total-blocking-time': {
    title: 'Page freezes during load',
    descriptionTemplate:
      "Your page is unresponsive for {value} while loading. Users can't click, scroll, or interact during this time.",
    impactTemplate:
      'High blocking time makes your site feel broken, especially on mobile devices.',
    category: 'performance',
    fixDifficulty: 'complex',
    severity: 'critical',
  },
  'cumulative-layout-shift': {
    title: 'Content shifts around while loading',
    descriptionTemplate:
      'Elements on your page move unexpectedly as it loads (shift score: {value}). Users may click the wrong thing or lose their place.',
    impactTemplate:
      'Layout shifts frustrate users and directly hurt your Google search ranking.',
    category: 'performance',
    fixDifficulty: 'easy',
    severity: 'warning',
  },
  'speed-index': {
    title: 'Page feels slow to visually complete',
    descriptionTemplate:
      'Your page takes {value} to visually fill the screen. Content loads in chunks rather than appearing smoothly.',
    impactTemplate:
      'A slow speed index makes your site feel sluggish compared to competitors.',
    category: 'performance',
    fixDifficulty: 'moderate',
    severity: 'warning',
  },
  'render-blocking-resources': {
    title: 'Files are blocking your page from loading',
    descriptionTemplate:
      '{value} resources are preventing your page from rendering. The browser must download these before showing anything.',
    impactTemplate:
      'Removing render-blocking resources can shave 1-3 seconds off perceived load time.',
    category: 'performance',
    fixDifficulty: 'moderate',
    severity: 'warning',
  },
  'uses-optimized-images': {
    title: "Images aren't compressed",
    descriptionTemplate:
      'Your images could be {value} smaller without visible quality loss. Uncompressed images are the #1 cause of slow pages.',
    impactTemplate:
      'Compressed images typically reduce page weight by 30-50%, directly improving load time.',
    category: 'performance',
    fixDifficulty: 'easy',
    severity: 'warning',
  },
  'uses-responsive-images': {
    title: 'Mobile users are downloading desktop-sized images',
    descriptionTemplate:
      '{value} could serve appropriately-sized versions for each device. Phone users are downloading images meant for large screens.',
    impactTemplate:
      'Responsive images can reduce mobile data usage by 50%+ and speed up page loads significantly.',
    category: 'performance',
    fixDifficulty: 'easy',
    severity: 'warning',
  },
  'offscreen-images': {
    title: 'Images load before users scroll to them',
    descriptionTemplate:
      '{value} below the fold load immediately instead of waiting until the user scrolls down. This wastes bandwidth and slows the initial page.',
    impactTemplate:
      'Lazy-loading offscreen images can reduce initial page weight by 30-60%.',
    category: 'performance',
    fixDifficulty: 'easy',
    severity: 'warning',
  },
  'uses-text-compression': {
    title: "Text content isn't compressed",
    descriptionTemplate:
      "Your server isn't compressing text-based files. Enabling compression could save {value} of transfer size.",
    impactTemplate:
      'Text compression (gzip/brotli) typically reduces file sizes by 60-80% with minimal server effort.',
    category: 'performance',
    fixDifficulty: 'easy',
    severity: 'warning',
  },
  'unminified-css': {
    title: 'CSS files contain unnecessary whitespace',
    descriptionTemplate:
      'Your CSS files could be {value} smaller by removing comments and whitespace. This is free performance.',
    impactTemplate:
      'Minified CSS loads faster and costs nothing in development effort.',
    category: 'performance',
    fixDifficulty: 'easy',
    severity: 'info',
  },
  'unminified-javascript': {
    title: "JavaScript files aren't minified",
    descriptionTemplate:
      "Your JavaScript could be {value} smaller. Unminified code contains developer comments and formatting that users don't need.",
    impactTemplate:
      'Minified JavaScript loads and parses faster, improving time-to-interactive.',
    category: 'performance',
    fixDifficulty: 'easy',
    severity: 'info',
  },
  'color-contrast': {
    title: 'Some text is hard to read',
    descriptionTemplate:
      "{value} text elements don't have enough contrast against their background. This affects readability for all users, especially those with visual impairments.",
    impactTemplate:
      'Low contrast makes your site unusable for ~15% of the population and violates accessibility standards.',
    category: 'accessibility',
    fixDifficulty: 'easy',
    severity: 'critical',
  },
  'image-alt': {
    title: 'Images are missing descriptions',
    descriptionTemplate:
      "{value} images don't have alt text. Screen readers can't describe these to visually impaired users, and search engines can't understand them.",
    impactTemplate:
      'Missing alt text hurts both accessibility compliance and your SEO ranking.',
    category: 'accessibility',
    fixDifficulty: 'easy',
    severity: 'critical',
  },
  label: {
    title: 'Form fields are missing labels',
    descriptionTemplate:
      "{value} form inputs don't have associated labels. Users relying on screen readers can't tell what information is being requested.",
    impactTemplate:
      'Unlabeled forms are unusable for screen reader users and can confuse all users.',
    category: 'accessibility',
    fixDifficulty: 'easy',
    severity: 'critical',
  },
  'heading-order': {
    title: 'Heading levels are out of order',
    descriptionTemplate:
      'Your page skips heading levels (e.g., jumping from H1 to H3). This breaks the logical outline that screen readers use to navigate.',
    impactTemplate:
      'Proper heading hierarchy helps both accessibility and SEO content structure.',
    category: 'accessibility',
    fixDifficulty: 'easy',
    severity: 'warning',
  },
  'link-name': {
    title: "Links don't describe where they go",
    descriptionTemplate:
      '{value} links lack descriptive text. "Click here" or empty links are meaningless to screen reader users.',
    impactTemplate:
      'Descriptive link text improves navigation for all users and helps SEO.',
    category: 'accessibility',
    fixDifficulty: 'easy',
    severity: 'warning',
  },
  'document-title': {
    title: 'Page is missing a title',
    descriptionTemplate:
      "Your page doesn't have a <title> tag. This is what appears in browser tabs, search results, and social shares.",
    impactTemplate:
      'Missing titles significantly hurt SEO ranking and click-through rates from search results.',
    category: 'seo',
    fixDifficulty: 'easy',
    severity: 'critical',
  },
  'meta-description': {
    title: 'Page is missing a meta description',
    descriptionTemplate:
      "Your page doesn't have a meta description. Search engines display this as the snippet below your page title in results.",
    impactTemplate:
      'Pages with good meta descriptions get up to 5.8% higher click-through rates from search.',
    category: 'seo',
    fixDifficulty: 'easy',
    severity: 'warning',
  },
  viewport: {
    title: "Page isn't configured for mobile",
    descriptionTemplate:
      'Your page is missing a viewport meta tag. Mobile devices will render it at desktop width, making it tiny and unusable.',
    impactTemplate:
      'Without a viewport tag, your site is effectively broken on mobile — where 60%+ of web traffic comes from.',
    category: 'ux',
    fixDifficulty: 'easy',
    severity: 'critical',
  },
  'http-status-code': {
    title: 'Page returns an error',
    descriptionTemplate:
      'Your page returned an unsuccessful HTTP status code. Search engines may not index this page.',
    impactTemplate:
      'Error status codes prevent search engines from indexing your content.',
    category: 'seo',
    fixDifficulty: 'moderate',
    severity: 'critical',
  },
  'is-crawlable': {
    title: "Search engines can't find this page",
    descriptionTemplate:
      "Your page is blocked from search engine crawling. This means it won't appear in Google or other search results.",
    impactTemplate: 'A blocked page is invisible to organic search traffic.',
    category: 'seo',
    fixDifficulty: 'easy',
    severity: 'critical',
  },
};
