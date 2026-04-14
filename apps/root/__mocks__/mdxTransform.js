/**
 * Jest transformer for .mdx files.
 *
 * In production, MDX is compiled by @next/mdx via webpack/turbopack. Jest has
 * no MDX loader, so without a transform every `import { metadata } from './x.mdx'`
 * returns undefined — which breaks contentRegistry tests once MDX becomes the
 * single source of truth for content metadata.
 *
 * This transformer does a minimal job: extract the `export const metadata = {...}`
 * block via balanced-brace matching, re-emit it as a plain module export, and
 * stub the default export (the React component) with a no-op functional
 * component. We don't need to render MDX bodies in unit tests — only read the
 * metadata — so we skip the heavier @mdx-js/mdx compile step.
 */

function extractMetadataBlock(src) {
  const start = src.indexOf('export const metadata');
  if (start < 0) return null;
  const open = src.indexOf('{', start);
  if (open < 0) return null;
  let depth = 1;
  let i = open + 1;
  // Walk the source a char at a time; track string/template literal states so
  // we don't count braces inside strings.
  let inString = null; // null | "'" | '"' | '`'
  let escaped = false;
  while (i < src.length && depth > 0) {
    const ch = src[i];
    if (escaped) {
      escaped = false;
    } else if (inString) {
      if (ch === '\\') escaped = true;
      else if (ch === inString) inString = null;
    } else {
      if (ch === "'" || ch === '"' || ch === '`') inString = ch;
      else if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) break;
      }
    }
    i++;
  }
  if (depth !== 0) return null;
  // src[i] is the matching `}`. Return the full block including the opening
  // `{` so the object literal is self-contained.
  return src.slice(open, i + 1);
}

module.exports = {
  process(src) {
    const block = extractMetadataBlock(src);
    const metadataLiteral = block ?? '{}';
    // Re-export: one named `metadata` export plus a stub default component.
    const code =
      `const metadata = ${metadataLiteral};\n` +
      `function MdxStub() { return null; }\n` +
      `module.exports = { __esModule: true, metadata, default: MdxStub };\n`;
    return { code };
  },
};
