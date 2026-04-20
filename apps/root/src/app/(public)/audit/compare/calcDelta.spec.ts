import type { ScanIssue } from '@danieljoffe.com/shared-audit';
import { scoreDelta, cwvDelta, diffIssues } from './calcDelta';

function buildIssue(overrides: Partial<ScanIssue>): ScanIssue {
  return {
    id: 'id',
    scan_id: 'scan',
    category: 'performance',
    severity: 'warning',
    title: 'default',
    description: '',
    impact: null,
    fix_difficulty: null,
    technical_detail: null,
    sort_order: 0,
    ...overrides,
  };
}

describe('scoreDelta', () => {
  it('reports improvement when score rises', () => {
    expect(scoreDelta(60, 85)).toEqual({ delta: 25, direction: 'improved' });
  });

  it('reports regression when score falls', () => {
    expect(scoreDelta(90, 72)).toEqual({ delta: -18, direction: 'regressed' });
  });

  it('reports unchanged when scores match', () => {
    expect(scoreDelta(80, 80)).toEqual({ delta: 0, direction: 'unchanged' });
  });

  it('returns unknown when either side is null', () => {
    expect(scoreDelta(null, 80)).toEqual({ delta: null, direction: 'unknown' });
    expect(scoreDelta(80, null)).toEqual({ delta: null, direction: 'unknown' });
    expect(scoreDelta(null, null)).toEqual({
      delta: null,
      direction: 'unknown',
    });
  });

  it('returns unknown when either side is undefined', () => {
    expect(scoreDelta(undefined, 80)).toEqual({
      delta: null,
      direction: 'unknown',
    });
  });
});

describe('cwvDelta', () => {
  it('reports improvement when metric drops (lower is better)', () => {
    expect(cwvDelta(2400, 1800)).toEqual({
      delta: -600,
      direction: 'improved',
    });
  });

  it('reports regression when metric rises', () => {
    expect(cwvDelta(1500, 2200)).toEqual({
      delta: 700,
      direction: 'regressed',
    });
  });

  it('reports unchanged when metric matches', () => {
    expect(cwvDelta(0.05, 0.05)).toEqual({ delta: 0, direction: 'unchanged' });
  });

  it('returns unknown for null values', () => {
    expect(cwvDelta(null, 1000)).toEqual({
      delta: null,
      direction: 'unknown',
    });
    expect(cwvDelta(1000, null)).toEqual({
      delta: null,
      direction: 'unknown',
    });
  });
});

describe('diffIssues', () => {
  it('keys by category + title (not id)', () => {
    const issuesA = [
      buildIssue({ id: 'a1', category: 'performance', title: 'LCP slow' }),
      buildIssue({ id: 'a2', category: 'accessibility', title: 'No alt text' }),
    ];
    const issuesB = [
      buildIssue({ id: 'b1', category: 'performance', title: 'LCP slow' }),
      buildIssue({ id: 'b2', category: 'seo', title: 'Missing meta' }),
    ];

    const { resolved, added, persisted } = diffIssues(issuesA, issuesB);

    expect(resolved).toHaveLength(1);
    expect(resolved[0]!.title).toBe('No alt text');
    expect(added).toHaveLength(1);
    expect(added[0]!.title).toBe('Missing meta');
    expect(persisted).toHaveLength(1);
    expect(persisted[0]!.a.id).toBe('a1');
    expect(persisted[0]!.b.id).toBe('b1');
  });

  it('distinguishes issues with same title but different category', () => {
    const issuesA = [
      buildIssue({ id: 'a1', category: 'performance', title: 'Slow' }),
    ];
    const issuesB = [
      buildIssue({ id: 'b1', category: 'accessibility', title: 'Slow' }),
    ];
    const { resolved, added, persisted } = diffIssues(issuesA, issuesB);
    expect(resolved).toHaveLength(1);
    expect(added).toHaveLength(1);
    expect(persisted).toHaveLength(0);
  });

  it('handles empty inputs', () => {
    expect(diffIssues([], [])).toEqual({
      resolved: [],
      added: [],
      persisted: [],
    });
  });

  it('treats all as added when A is empty', () => {
    const issuesB = [buildIssue({ id: 'b1', title: 't' })];
    const { resolved, added, persisted } = diffIssues([], issuesB);
    expect(resolved).toEqual([]);
    expect(added).toEqual(issuesB);
    expect(persisted).toEqual([]);
  });

  it('treats all as resolved when B is empty', () => {
    const issuesA = [buildIssue({ id: 'a1', title: 't' })];
    const { resolved, added, persisted } = diffIssues(issuesA, []);
    expect(resolved).toEqual(issuesA);
    expect(added).toEqual([]);
    expect(persisted).toEqual([]);
  });
});
