from dataclasses import dataclass
from typing import Literal

Category = Literal["performance", "accessibility", "seo", "ux"]
Severity = Literal["critical", "warning", "info"]
FixDifficulty = Literal["easy", "moderate", "complex"]


@dataclass(frozen=True)
class IssueMapping:
    title: str
    description_template: str
    impact_template: str
    category: Category
    fix_difficulty: FixDifficulty
    severity: Severity


LIGHTHOUSE_ISSUE_MAPPINGS: dict[str, IssueMapping] = {
    "largest-contentful-paint": IssueMapping(
        title="Main content takes too long to appear",
        description_template=(
            "Your page's primary content takes {value} to load. Users expect to see "
            "meaningful content within 2.5 seconds on mobile."
        ),
        impact_template=(
            "Pages with LCP over 4 seconds lose up to 25% of visitors before they see "
            "your content."
        ),
        category="performance",
        fix_difficulty="moderate",
        severity="critical",
    ),
    "first-contentful-paint": IssueMapping(
        title="Page is slow to show anything",
        description_template=(
            "It takes {value} before any content appears on screen. On slower mobile "
            "connections, this feels even longer."
        ),
        impact_template=(
            "Every second of delay in first paint increases bounce probability by 32%."
        ),
        category="performance",
        fix_difficulty="moderate",
        severity="critical",
    ),
    "total-blocking-time": IssueMapping(
        title="Page freezes during load",
        description_template=(
            "Your page is unresponsive for {value} while loading. Users can't click, "
            "scroll, or interact during this time."
        ),
        impact_template=(
            "High blocking time makes your site feel broken, especially on mobile "
            "devices."
        ),
        category="performance",
        fix_difficulty="complex",
        severity="critical",
    ),
    "cumulative-layout-shift": IssueMapping(
        title="Content shifts around while loading",
        description_template=(
            "Elements on your page move unexpectedly as it loads (shift score: "
            "{value}). Users may click the wrong thing or lose their place."
        ),
        impact_template=(
            "Layout shifts frustrate users and directly hurt your Google search "
            "ranking."
        ),
        category="performance",
        fix_difficulty="easy",
        severity="warning",
    ),
    "speed-index": IssueMapping(
        title="Page feels slow to visually complete",
        description_template=(
            "Your page takes {value} to visually fill the screen. Content loads in "
            "chunks rather than appearing smoothly."
        ),
        impact_template=(
            "A slow speed index makes your site feel sluggish compared to competitors."
        ),
        category="performance",
        fix_difficulty="moderate",
        severity="warning",
    ),
    "render-blocking-resources": IssueMapping(
        title="Files are blocking your page from loading",
        description_template=(
            "{value} resources are preventing your page from rendering. The browser "
            "must download these before showing anything."
        ),
        impact_template=(
            "Removing render-blocking resources can shave 1-3 seconds off perceived "
            "load time."
        ),
        category="performance",
        fix_difficulty="moderate",
        severity="warning",
    ),
    "uses-optimized-images": IssueMapping(
        title="Images aren't compressed",
        description_template=(
            "Your images could be {value} smaller without visible quality loss. "
            "Uncompressed images are the #1 cause of slow pages."
        ),
        impact_template=(
            "Compressed images typically reduce page weight by 30-50%, directly "
            "improving load time."
        ),
        category="performance",
        fix_difficulty="easy",
        severity="warning",
    ),
    "uses-responsive-images": IssueMapping(
        title="Mobile users are downloading desktop-sized images",
        description_template=(
            "{value} could serve appropriately-sized versions for each device. Phone "
            "users are downloading images meant for large screens."
        ),
        impact_template=(
            "Responsive images can reduce mobile data usage by 50%+ and speed up page "
            "loads significantly."
        ),
        category="performance",
        fix_difficulty="easy",
        severity="warning",
    ),
    "offscreen-images": IssueMapping(
        title="Images load before users scroll to them",
        description_template=(
            "{value} below the fold load immediately instead of waiting until the user "
            "scrolls down. This wastes bandwidth and slows the initial page."
        ),
        impact_template=(
            "Lazy-loading offscreen images can reduce initial page weight by 30-60%."
        ),
        category="performance",
        fix_difficulty="easy",
        severity="warning",
    ),
    "uses-text-compression": IssueMapping(
        title="Text content isn't compressed",
        description_template=(
            "Your server isn't compressing text-based files. Enabling compression "
            "could save {value} of transfer size."
        ),
        impact_template=(
            "Text compression (gzip/brotli) typically reduces file sizes by 60-80% "
            "with minimal server effort."
        ),
        category="performance",
        fix_difficulty="easy",
        severity="warning",
    ),
    "unminified-css": IssueMapping(
        title="CSS files contain unnecessary whitespace",
        description_template=(
            "Your CSS files could be {value} smaller by removing comments and "
            "whitespace. This is free performance."
        ),
        impact_template=(
            "Minified CSS loads faster and costs nothing in development effort."
        ),
        category="performance",
        fix_difficulty="easy",
        severity="info",
    ),
    "unminified-javascript": IssueMapping(
        title="JavaScript files aren't minified",
        description_template=(
            "Your JavaScript could be {value} smaller. Unminified code contains "
            "developer comments and formatting that users don't need."
        ),
        impact_template=(
            "Minified JavaScript loads and parses faster, improving time-to-interactive."
        ),
        category="performance",
        fix_difficulty="easy",
        severity="info",
    ),
    "color-contrast": IssueMapping(
        title="Some text is hard to read",
        description_template=(
            "{value} text elements don't have enough contrast against their "
            "background. This affects readability for all users, especially those with "
            "visual impairments."
        ),
        impact_template=(
            "Low contrast makes your site unusable for ~15% of the population and "
            "violates accessibility standards."
        ),
        category="accessibility",
        fix_difficulty="easy",
        severity="critical",
    ),
    "image-alt": IssueMapping(
        title="Images are missing descriptions",
        description_template=(
            "{value} images don't have alt text. Screen readers can't describe these "
            "to visually impaired users, and search engines can't understand them."
        ),
        impact_template=(
            "Missing alt text hurts both accessibility compliance and your SEO ranking."
        ),
        category="accessibility",
        fix_difficulty="easy",
        severity="critical",
    ),
    "label": IssueMapping(
        title="Form fields are missing labels",
        description_template=(
            "{value} form inputs don't have associated labels. Users relying on screen "
            "readers can't tell what information is being requested."
        ),
        impact_template=(
            "Unlabeled forms are unusable for screen reader users and can confuse all "
            "users."
        ),
        category="accessibility",
        fix_difficulty="easy",
        severity="critical",
    ),
    "heading-order": IssueMapping(
        title="Heading levels are out of order",
        description_template=(
            "Your page skips heading levels (e.g., jumping from H1 to H3). This breaks "
            "the logical outline that screen readers use to navigate."
        ),
        impact_template=(
            "Proper heading hierarchy helps both accessibility and SEO content "
            "structure."
        ),
        category="accessibility",
        fix_difficulty="easy",
        severity="warning",
    ),
    "link-name": IssueMapping(
        title="Links don't describe where they go",
        description_template=(
            '{value} links lack descriptive text. "Click here" or empty links are '
            "meaningless to screen reader users."
        ),
        impact_template=(
            "Descriptive link text improves navigation for all users and helps SEO."
        ),
        category="accessibility",
        fix_difficulty="easy",
        severity="warning",
    ),
    "document-title": IssueMapping(
        title="Page is missing a title",
        description_template=(
            "Your page doesn't have a <title> tag. This is what appears in browser "
            "tabs, search results, and social shares."
        ),
        impact_template=(
            "Missing titles significantly hurt SEO ranking and click-through rates "
            "from search results."
        ),
        category="seo",
        fix_difficulty="easy",
        severity="critical",
    ),
    "meta-description": IssueMapping(
        title="Page is missing a meta description",
        description_template=(
            "Your page doesn't have a meta description. Search engines display this as "
            "the snippet below your page title in results."
        ),
        impact_template=(
            "Pages with good meta descriptions get up to 5.8% higher click-through "
            "rates from search."
        ),
        category="seo",
        fix_difficulty="easy",
        severity="warning",
    ),
    "viewport": IssueMapping(
        title="Page isn't configured for mobile",
        description_template=(
            "Your page is missing a viewport meta tag. Mobile devices will render it "
            "at desktop width, making it tiny and unusable."
        ),
        impact_template=(
            "Without a viewport tag, your site is effectively broken on mobile — "
            "where 60%+ of web traffic comes from."
        ),
        category="ux",
        fix_difficulty="easy",
        severity="critical",
    ),
    "http-status-code": IssueMapping(
        title="Page returns an error",
        description_template=(
            "Your page returned an unsuccessful HTTP status code. Search engines may "
            "not index this page."
        ),
        impact_template=(
            "Error status codes prevent search engines from indexing your content."
        ),
        category="seo",
        fix_difficulty="moderate",
        severity="critical",
    ),
    "is-crawlable": IssueMapping(
        title="Search engines can't find this page",
        description_template=(
            "Your page is blocked from search engine crawling. This means it won't "
            "appear in Google or other search results."
        ),
        impact_template="A blocked page is invisible to organic search traffic.",
        category="seo",
        fix_difficulty="easy",
        severity="critical",
    ),
}
