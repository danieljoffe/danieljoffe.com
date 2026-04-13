#!/usr/bin/env tsx
/**
 * Content validation script.
 *
 * Validates all MDX `export const metadata` blocks against Zod schemas
 * derived from the content style guide. Checks:
 *
 *  - Schema compliance (required fields, types, character limits)
 *  - Canonical tag and category vocabularies
 *  - No em dashes in excerpts
 *  - Unique cover.src across all content types
 *  - Unique slug within each content type
 *  - Slug matches filename
 *  - Category not duplicated in tags
 *  - Deprecated `topic` field must not exist
 *
 * Exit code 0 = all valid, exit code 1 = validation errors found.
 *
 * Usage: tsx scripts/validate-content.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { postMetadataSchema, TAG_MERGES } from './content-schema';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const CONTENT_DIR = path.resolve(__dirname, '../apps/root/src/data/content');

const CONTENT_TYPES = ['blog', 'projects', 'experience'] as const;

// ---------------------------------------------------------------------------
// Metadata extraction
// ---------------------------------------------------------------------------

/**
 * Extract `export const metadata = { ... };` from an MDX file.
 * Uses regex + Function constructor — safe because metadata blocks are
 * simple object literals with no computed values.
 */
function extractMetadata(filePath: string): unknown {
  const content = fs.readFileSync(filePath, 'utf-8');
  const match = content.match(
    /export\s+const\s+metadata\s*=\s*(\{[\s\S]*?\n\});?/
  );
  if (!match) {
    throw new Error(`No metadata export found in ${filePath}`);
  }
  try {
    return new Function(`return ${match[1]}`)();
  } catch (err) {
    throw new Error(
      `Failed to parse metadata in ${filePath}: ${(err as Error).message}`,
      { cause: err }
    );
  }
}

// ---------------------------------------------------------------------------
// Discover MDX files
// ---------------------------------------------------------------------------

function discoverMdxFiles(): { file: string; relativePath: string }[] {
  const files: { file: string; relativePath: string }[] = [];
  for (const type of CONTENT_TYPES) {
    const dir = path.join(CONTENT_DIR, type);
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir)) {
      if (entry.endsWith('.mdx')) {
        files.push({
          file: path.join(dir, entry),
          relativePath: `${type}/${entry}`,
        });
      }
    }
  }
  return files;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validate(): void {
  const files = discoverMdxFiles();
  const errors: string[] = [];
  const warnings: string[] = [];

  // Cross-file uniqueness trackers
  const coverSrcs = new Map<string, string>();
  const slugsByType = new Map<string, string>();

  let validCount = 0;

  for (const { file, relativePath } of files) {
    // 1. Extract metadata
    let raw: unknown;
    try {
      raw = extractMetadata(file);
    } catch (err) {
      errors.push(`${relativePath}: ${(err as Error).message}`);
      continue;
    }

    // 2. Check for deprecated `topic` field
    if (typeof raw === 'object' && raw !== null && 'topic' in raw) {
      errors.push(
        `${relativePath}: Deprecated "topic" field found (removed in #336). Use "category" instead.`
      );
    }

    // 3. Validate against Zod schema
    const result = postMetadataSchema.safeParse(raw);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        errors.push(
          `${relativePath}: ${path ? `${path} — ` : ''}${issue.message}`
        );
      }
      continue;
    }

    const data = result.data;

    // 4. Check for non-canonical tag synonyms (warn, suggest merge)
    for (const tag of data.tags) {
      if (tag in TAG_MERGES) {
        warnings.push(
          `${relativePath}: Tag "${tag}" should be "${TAG_MERGES[tag]}" (canonical merge)`
        );
      }
    }

    // 5. Cross-file: unique cover.src
    const existingCover = coverSrcs.get(data.cover.src);
    if (existingCover) {
      errors.push(
        `${relativePath}: Duplicate cover.src "${data.cover.src}" (already used by ${existingCover})`
      );
    } else {
      coverSrcs.set(data.cover.src, relativePath);
    }

    // 6. Cross-file: unique slug within type
    const slugKey = `${data.type}:${data.slug}`;
    const existingSlug = slugsByType.get(slugKey);
    if (existingSlug) {
      errors.push(
        `${relativePath}: Duplicate slug "${data.slug}" for type "${data.type}" (already used by ${existingSlug})`
      );
    } else {
      slugsByType.set(slugKey, relativePath);
    }

    // 7. Slug must match filename
    const expectedSlug = path.basename(file, '.mdx');
    if (data.slug !== expectedSlug) {
      errors.push(
        `${relativePath}: Slug "${data.slug}" does not match filename "${expectedSlug}"`
      );
    }

    // 8. Category should not duplicate a tag (style guide rule)
    if (data.tags.includes(data.category)) {
      warnings.push(
        `${relativePath}: Category "${data.category}" is also in tags (style guide: no category duplicates in tags)`
      );
    }

    // 9. Blog/project must not use "Career Experience" category
    if (
      (data.type === 'blog' || data.type === 'project') &&
      data.category === 'Career Experience'
    ) {
      errors.push(
        `${relativePath}: "${data.type}" entries must not use "Career Experience" category`
      );
    }

    validCount++;
  }

  // ---------------------------------------------------------------------------
  // Report
  // ---------------------------------------------------------------------------

  if (warnings.length > 0) {
    console.warn('\nWarnings:\n');
    warnings.forEach(w => console.warn(`  ⚠  ${w}`));
  }

  if (errors.length > 0) {
    console.error('\nContent validation failed:\n');
    errors.forEach(e => console.error(`  ✗  ${e}`));
    console.error(`\n${errors.length} error(s) in ${files.length} files.\n`);
    process.exit(1);
  }

  console.log(`\n✓ All ${validCount} content files validated successfully.\n`);
}

validate();
