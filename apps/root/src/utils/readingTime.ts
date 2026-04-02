const WORDS_PER_MINUTE = 225;

/**
 * Strip MDX/JSX syntax, metadata exports, and markdown formatting
 * to extract only the readable prose content.
 */
function stripMdxSyntax(content: string): string {
  return (
    content
      // Remove the metadata export block (export const metadata = { ... };)
      .replace(/export\s+const\s+metadata\s*=\s*\{[\s\S]*?\};\s*/g, '')
      // Remove import statements
      .replace(/^import\s+.*$/gm, '')
      // Remove export statements (other than metadata already removed)
      .replace(/^export\s+.*$/gm, '')
      // Remove JSX/HTML tags
      .replace(/<[^>]+>/g, '')
      // Remove markdown images ![alt](url)
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      // Remove markdown links but keep text [text](url) → text
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      // Remove markdown headings markers
      .replace(/^#{1,6}\s+/gm, '')
      // Remove bold/italic markers
      .replace(/[*_]{1,3}/g, '')
      // Remove inline code backticks
      .replace(/`{1,3}[^`]*`{1,3}/g, '')
      // Remove code fences
      .replace(/```[\s\S]*?```/g, '')
      // Remove horizontal rules
      .replace(/^[-*_]{3,}$/gm, '')
      // Remove blockquote markers
      .replace(/^>\s*/gm, '')
      // Remove list markers
      .replace(/^[\s]*[-*+]\s+/gm, '')
      .replace(/^[\s]*\d+\.\s+/gm, '')
      // Collapse whitespace
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * Calculate reading time in minutes from raw MDX content.
 * Returns a minimum of 1 minute.
 */
export function calculateReadingTime(rawContent: string): number {
  const text = stripMdxSyntax(rawContent);
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const minutes = Math.ceil(wordCount / WORDS_PER_MINUTE);
  return Math.max(1, minutes);
}
