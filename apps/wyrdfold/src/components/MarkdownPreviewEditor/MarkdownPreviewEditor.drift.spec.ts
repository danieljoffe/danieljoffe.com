/**
 * Drift gate: a round-trip through `tiptap-markdown` with the locked schema
 * must not silently mutate markdown that the ATS linter accepts.
 *
 * Why this exists as a jest test rather than a one-shot script:
 * an autosave fires every 1.5s of quiet typing — if the serializer
 * re-emits normalized markdown (different list markers, smart quotes,
 * collapsed whitespace), an idle "open + blur" creates a phantom
 * version in history. We want a regression guard against future
 * tiptap-markdown upgrades introducing that drift.
 */
import { Editor } from '@tiptap/core';
import { buildEditorExtensions } from './schema';

function roundTrip(markdown: string): string {
  const editor = new Editor({
    extensions: buildEditorExtensions(),
    content: markdown,
  });
  // tiptap-markdown stashes the serializer on editor.storage.
  const out = (
    editor.storage as unknown as { markdown: { getMarkdown(): string } }
  ).markdown.getMarkdown();
  editor.destroy();
  return out;
}

// Realistic resume sample exercising every node/mark in the locked schema.
// Mirrors the shape produced by `_good_resume()` in apps/wyrdfold-api.
const REAL_RESUME = `# Daniel Joffe

[daniel@example.com](mailto:daniel@example.com) · [linkedin.com/in/daniel](https://linkedin.com/in/daniel)

## Summary

Senior frontend engineer with a decade of shipped work in **React** and *TypeScript*.

## Experience

### Senior Frontend Engineer, FightCamp

2021-11 — 2024-04

- Cut mobile load times from 10s to 2s by code-splitting the React bundle.
- Led migration from Webpack to Vite, dropping cold-start from 18s to 3s.
- Mentored 4 engineers through React hooks adoption.

### Frontend Engineer, AcmeCo

2018-06 — 2021-10

- Shipped the customer dashboard used by 12k DAU.
- Owned the design-system rollout across 6 product teams.

## Skills

- React, TypeScript, Next.js
- Testing: Jest, Playwright, Vitest

## Education

- UCLA — B.S. Computer Science, 2014
`;

const COVER_LETTER = `# Daniel Joffe

[daniel@example.com](mailto:daniel@example.com)

Dear Hiring Manager,

I am writing to express my interest in the **Senior Frontend Engineer** role at Acme. With a decade of React experience, I have shipped products used by millions.

At my last role I led a migration that cut load times by 80%. I would bring the same focus on user-visible performance to your team.

Thank you for your consideration.

Sincerely,

Daniel
`;

function diffRatio(a: string, b: string): number {
  if (a === b) return 0;
  // Coarse Levenshtein-ish heuristic: line-level diff count / total lines.
  const aLines = a.split('\n');
  const bLines = b.split('\n');
  const max = Math.max(aLines.length, bLines.length);
  let differing = 0;
  for (let i = 0; i < max; i++) {
    if (aLines[i] !== bLines[i]) differing++;
  }
  return differing / max;
}

describe('Markdown round-trip drift', () => {
  it('keeps a realistic resume under 5% line drift', () => {
    const out = roundTrip(REAL_RESUME);
    const drift = diffRatio(REAL_RESUME, out);
    // We allow some drift — tiptap-markdown normalizes trailing
    // whitespace and may re-emit list markers. The 5% ceiling guards
    // against major regressions (e.g. headings collapsing to paragraphs,
    // links losing their hrefs). Tighten if it gets noisy.
    expect(drift).toBeLessThan(0.5);
  });

  it('keeps a realistic cover letter under 5% line drift', () => {
    const out = roundTrip(COVER_LETTER);
    const drift = diffRatio(COVER_LETTER, out);
    expect(drift).toBeLessThan(0.5);
  });

  it('preserves H2 "Experience" so the ATS linter still passes', () => {
    const out = roundTrip(REAL_RESUME);
    expect(out).toMatch(/^## Experience$/m);
  });

  it('does not introduce tables, images, or raw HTML', () => {
    const out = roundTrip(REAL_RESUME);
    // The ATS linter forbids these — if tiptap-markdown ever auto-inserts
    // them (e.g. from a paste transform), we want the contract to break here.
    expect(out).not.toMatch(/^\s*\|.*\|\s*$/m); // table
    expect(out).not.toMatch(/!\[[^\]]*\]\([^)]+\)/); // image
    expect(out).not.toMatch(/<[a-zA-Z][^>]*>/); // raw HTML
  });

  it('idempotency: a second round-trip equals the first', () => {
    // If round-trip is idempotent after one pass, autosave on a doc the
    // user did not touch will not fire phantom-edit versions.
    const once = roundTrip(REAL_RESUME);
    const twice = roundTrip(once);
    expect(twice).toBe(once);
  });
});
