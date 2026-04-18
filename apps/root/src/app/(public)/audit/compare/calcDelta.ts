import type { ScanIssue } from '@danieljoffe.com/shared-audit';

export type DeltaDirection = 'improved' | 'regressed' | 'unchanged' | 'unknown';

export interface Delta {
  delta: number | null;
  direction: DeltaDirection;
}

/**
 * Lighthouse scores: higher is better.
 */
export function scoreDelta(
  a: number | null | undefined,
  b: number | null | undefined
): Delta {
  if (a == null || b == null) {
    return { delta: null, direction: 'unknown' };
  }
  const delta = b - a;
  if (delta === 0) return { delta: 0, direction: 'unchanged' };
  return { delta, direction: delta > 0 ? 'improved' : 'regressed' };
}

/**
 * Core Web Vitals metrics: lower is better (fcp, lcp, tbt, cls, si).
 */
export function cwvDelta(
  a: number | null | undefined,
  b: number | null | undefined
): Delta {
  if (a == null || b == null) {
    return { delta: null, direction: 'unknown' };
  }
  const delta = b - a;
  if (delta === 0) return { delta: 0, direction: 'unchanged' };
  return { delta, direction: delta < 0 ? 'improved' : 'regressed' };
}

export interface IssueDiff {
  resolved: ScanIssue[];
  added: ScanIssue[];
  persisted: Array<{ a: ScanIssue; b: ScanIssue }>;
}

function issueKey(issue: ScanIssue): string {
  return `${issue.category}::${issue.title}`;
}

/**
 * Diff two scan_issue lists by (category, title). Issues don't have stable
 * IDs across scans — the same audit rule generates a new row per scan, so we
 * key on the combination of category + title which uniquely identifies a rule.
 */
export function diffIssues(
  issuesA: ScanIssue[],
  issuesB: ScanIssue[]
): IssueDiff {
  const mapA = new Map(issuesA.map(i => [issueKey(i), i]));
  const mapB = new Map(issuesB.map(i => [issueKey(i), i]));

  const resolved: ScanIssue[] = [];
  const added: ScanIssue[] = [];
  const persisted: Array<{ a: ScanIssue; b: ScanIssue }> = [];

  for (const [key, a] of mapA) {
    const b = mapB.get(key);
    if (b) {
      persisted.push({ a, b });
    } else {
      resolved.push(a);
    }
  }

  for (const [key, b] of mapB) {
    if (!mapA.has(key)) {
      added.push(b);
    }
  }

  return { resolved, added, persisted };
}
