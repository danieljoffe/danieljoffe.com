import { calculateReadingTime } from '../readingTime';

describe('calculateReadingTime', () => {
  it('returns 1 for very short content', () => {
    expect(calculateReadingTime('Hello world')).toBe(1);
  });

  it('returns 1 for empty content', () => {
    expect(calculateReadingTime('')).toBe(1);
  });

  it('calculates correct reading time for longer content', () => {
    // 450 words at 225 wpm = 2 min
    const words = Array.from({ length: 450 }, (_, i) => `word${i}`).join(' ');
    expect(calculateReadingTime(words)).toBe(2);
  });

  it('rounds up to the nearest minute', () => {
    // 226 words at 225 wpm = 1.004 → ceil = 2 min
    const words = Array.from({ length: 226 }, (_, i) => `word${i}`).join(' ');
    expect(calculateReadingTime(words)).toBe(2);
  });

  it('strips metadata export blocks', () => {
    const content = `export const metadata = {
  title: 'Test Post',
  date: '2026-01-01',
  slug: 'test',
};

# Hello World

This is the actual content.`;
    const result = calculateReadingTime(content);
    // Only "Hello World This is the actual content." = ~7 words → 1 min
    expect(result).toBe(1);
  });

  it('strips markdown headings, bold, and italic markers', () => {
    const content = '## **Bold Heading**\n\n*Italic text* and _more italic_.';
    const result = calculateReadingTime(content);
    expect(result).toBe(1);
  });

  it('strips inline code and code fences', () => {
    const content = [
      'Use `console.log` for debugging.',
      '',
      '```typescript',
      'const x = 1;',
      'const y = 2;',
      '```',
      '',
      'More prose here.',
    ].join('\n');
    const result = calculateReadingTime(content);
    expect(result).toBe(1);
  });

  it('strips markdown links but keeps link text', () => {
    const content = 'Visit [my site](https://example.com) for more info.';
    const result = calculateReadingTime(content);
    expect(result).toBe(1);
  });

  it('strips markdown images', () => {
    const content = '![Alt text](https://example.com/image.png)\n\nSome text.';
    const result = calculateReadingTime(content);
    expect(result).toBe(1);
  });

  it('strips import and export statements', () => {
    const content = [
      "import { Component } from 'react';",
      "export default function Page() {}",
      '',
      'This is readable content with enough words to count.',
    ].join('\n');
    const result = calculateReadingTime(content);
    expect(result).toBe(1);
  });

  it('handles a realistic MDX file', () => {
    // ~450 words of prose mixed with MDX syntax
    const prose = Array.from({ length: 450 }, (_, i) => `word${i}`).join(' ');
    const content = [
      "export const metadata = { title: 'Test', slug: 'test' };",
      '',
      "import { Something } from './somewhere';",
      '',
      '# Main Title',
      '',
      '## Section One',
      '',
      prose,
      '',
      '```javascript',
      'const code = "should be stripped";',
      '```',
      '',
      '> A blockquote that adds a few more words here.',
      '',
      '- List item one',
      '- List item two',
    ].join('\n');

    const result = calculateReadingTime(content);
    // 450 words prose + some from blockquote and list items ≈ 2-3 min
    expect(result).toBeGreaterThanOrEqual(2);
    expect(result).toBeLessThanOrEqual(3);
  });
});
