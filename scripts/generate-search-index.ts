// TODO: migrate this file to the root app and run as part of the build process, so we don't have to manually run it when we add new content
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTENT_DIRS = {
  blog: path.join(__dirname, '../apps/root/src/data/content/blog'),
  projects: path.join(__dirname, '../apps/root/src/data/content/projects'),
  experience: path.join(__dirname, '../apps/root/src/data/content/experience'),
} as const;

const OUTPUT_PATH = path.join(
  __dirname,
  '../apps/root/src/data/generated/searchIndex.json'
);

// Types
type ContentType = keyof typeof CONTENT_DIRS;
type EntryType = 'blog' | 'project' | 'experience';

interface Metadata {
  title?: string;
  excerpt?: string;
  description?: string;
  tags?: string | string[];
  category?: string;
  type?: string;
  date?: string;
  author?: string;
  [key: string]: unknown; // For other possible fields
}

interface SearchEntry {
  id: string;
  slug: string;
  type: EntryType;
  title: string;
  excerpt: string;
  tags: string[];
  category: string;
  body: string;
  url: string;
  date: string | null;
  author: string | null;
}

function extractPlainTextFromMDX(content: string): string {
  let text = content;

  // Remove export const metadata block
  text = text.replace(/export\s+const\s+metadata\s*=\s*{[\s\S]*?};\s*\n?/, '');

  // Remove import statements
  text = text.replace(/^import\s+.*?;?\s*$/gm, '');

  // Remove export statements
  text = text.replace(/^export\s+.*?;?\s*$/gm, '');

  // Remove JSX tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Remove markdown image syntax
  text = text.replace(/!\[.*?\]\(.*?\)/g, '');

  // Remove markdown links but keep text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Remove markdown formatting
  text = text.replace(/(\*\*|__)(.*?)\1/g, '$2');
  text = text.replace(/(\*|_)(.*?)\1/g, '$2');

  // Remove headers markers
  text = text.replace(/^#{1,6}\s+/gm, '');

  // Remove code block fences
  text = text.replace(/```[\s\S]*?```/g, ' ');
  text = text.replace(/`([^`]+)`/g, '$1');

  // Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, '');

  // Collapse whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

/**
 * Parse metadata from export const metadata = { ... } format
 */
function parseMetadataFromExport(content: string): Metadata {
  const metadata: Metadata = {};

  // Match export const metadata = { ... };
  const exportMatch = content.match(
    /export\s+const\s+metadata\s*=\s*{([\s\S]*?)}\s*;?/
  );

  if (!exportMatch) {
    return metadata;
  }

  const metadataContent = exportMatch[1];

  // Handle simple key: value pairs (strings, numbers, booleans)
  const simplePattern = /(\w+):\s*(['"`])([^\2]*?)\2\s*,?\s*/g;
  let match: RegExpExecArray | null;
  while ((match = simplePattern.exec(metadataContent)) !== null) {
    metadata[match[1]] = match[3];
  }

  // Handle arrays: tags: ['tag1', 'tag2']
  const arrayPattern = /(\w+):\s*\[([\s\S]*?)\]\s*,?\s*/g;
  while ((match = arrayPattern.exec(metadataContent)) !== null) {
    const key = match[1];
    const arrayContent = match[2];

    // Extract array items (strings)
    const items: string[] = [];
    const itemPattern = /['"`]([^'"`]+)['"`]/g;
    let itemMatch: RegExpExecArray | null;
    while ((itemMatch = itemPattern.exec(arrayContent)) !== null) {
      items.push(itemMatch[1]);
    }
    metadata[key] = items;
  }

  // Handle dates (already captured by simplePattern, but ensure they're strings)
  if (metadata.date) {
    metadata.date = String(metadata.date);
  }

  return metadata;
}

/**
 * Parse MDX file with export const metadata format
 */
function parseMDXFile(filePath: string): {
  metadata: Metadata;
  content: string;
} {
  const rawContent = fs.readFileSync(filePath, 'utf-8');

  // Extract metadata from export statement
  const metadata = parseMetadataFromExport(rawContent);

  // Remove the export const metadata block to get the actual content
  let content = rawContent.replace(
    /export\s+const\s+metadata\s*=\s*{[\s\S]*?}\s*;?\s*\n?/,
    ''
  );

  // Also remove any remaining export statements
  content = content.replace(/^export\s+.*?;?\s*$/gm, '');

  // Clean up extra newlines at the start
  content = content.trim();

  return { metadata, content };
}

function getEntryType(type: ContentType): EntryType {
  switch (type) {
    case 'projects':
      return 'project';
    case 'experience':
      return 'experience';
    case 'blog':
      return 'blog';
    default:
      return 'blog';
  }
}

function generateSearchIndex(): void {
  const allEntries: SearchEntry[] = [];

  for (const [type, dirPath] of Object.entries(CONTENT_DIRS) as [
    ContentType,
    string,
  ][]) {
    if (!fs.existsSync(dirPath)) {
      console.warn(`⚠️ Directory not found: ${dirPath}`);
      continue;
    }

    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.mdx'));
    console.log(`📁 Processing ${type}: ${files.length} files`);

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const slug = file.replace(/\.mdx$/, '');

      try {
        const { metadata, content } = parseMDXFile(filePath);
        const plainTextBody = extractPlainTextFromMDX(content);

        // Ensure tags is always an array
        let tags: string[] = [];
        if (metadata.tags) {
          tags = Array.isArray(metadata.tags) ? metadata.tags : [metadata.tags];
        }

        const entry: SearchEntry = {
          id: `${type}:${slug}`,
          slug,
          type: getEntryType(type),
          title: metadata.title || slug.replace(/-/g, ' '),
          excerpt: metadata.excerpt || metadata.description || '',
          tags,
          category: metadata.category || metadata.type || '',
          body: plainTextBody,
          url: `/${type}/${slug}`,
          date: metadata.date || null,
          author: metadata.author || null,
        };

        allEntries.push(entry);
        console.log(`  ✅ ${slug} - ${entry.title}`);
      } catch (error) {
        console.error(`  ❌ Error processing ${file}:`, error);
      }
    }
  }

  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(allEntries, null, 2));
  console.log(
    `\n✅ Generated search index with ${allEntries.length} entries at ${OUTPUT_PATH}`
  );

  // Show sample of first entry for verification
  if (allEntries.length > 0) {
    console.log('\n📋 Sample entry:');
    console.log(`${JSON.stringify(allEntries[0], null, 2).slice(0, 500)}...`);
  }
}

generateSearchIndex();
