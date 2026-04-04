import { DOMAIN_URL, FULL_NAME } from '@/utils/constants';
import { getAllContent } from '@/data/contentRegistry';
import { contentTypeConfigs } from '@/data/contentTypeConfig';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

interface FeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  author: string;
  category: string;
}

function buildFeedItems(): FeedItem[] {
  return getAllContent()
    .map(entry => {
      const config = contentTypeConfigs[entry.type];
      const meta = entry.metadata;
      return {
        title: meta.title,
        link: `${DOMAIN_URL}${config.basePath}/${entry.slug}`,
        description: meta.excerpt,
        pubDate: new Date(meta.date).toUTCString(),
        author: meta.author,
        category: meta.category,
      };
    })
    .sort(
      (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
    );
}

function buildRssXml(items: FeedItem[]): string {
  const itemsXml = items
    .map(
      item => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <description>${escapeXml(item.description)}</description>
      <pubDate>${item.pubDate}</pubDate>
      <author>${escapeXml(item.author)}</author>
      <category>${escapeXml(item.category)}</category>
      <guid isPermaLink="true">${escapeXml(item.link)}</guid>
    </item>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(FULL_NAME)} — Blog, Projects &amp; Experience</title>
    <link>${DOMAIN_URL}</link>
    <description>Case studies, projects, and career experience from ${escapeXml(FULL_NAME)}, Full-Stack Engineer.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${DOMAIN_URL}/feed.xml" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>`;
}

export async function GET() {
  const items = buildFeedItems();
  const xml = buildRssXml(items);

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
