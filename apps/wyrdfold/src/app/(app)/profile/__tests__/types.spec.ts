import {
  GAP_KIND_LABELS,
  GAP_KIND_WEIGHTS,
  hasOptimized,
  hasProse,
  type OptimizedDoc,
  type OptimizedResponse,
  type ProseDoc,
  type ProseResponse,
} from '../types';

const PROSE: ProseDoc = {
  id: 'p1',
  user_id: 'u1',
  version: 1,
  content: '...',
  created_at: '2026-04-30T00:00:00.000Z',
};

const OPTIMIZED: OptimizedDoc = {
  id: 'o1',
  user_id: 'u1',
  prose_doc_id: 'p1',
  version: 1,
  payload: { summary: null, roles: [], skills: [], outcomes: [] },
  markdown_view: null,
  source: 'llm',
  created_at: '2026-04-30T00:00:00.000Z',
};

describe('hasProse', () => {
  it('narrows the record case', () => {
    const value: ProseResponse = PROSE;
    expect(hasProse(value)).toBe(true);
    if (hasProse(value)) {
      expect(value.id).toBe('p1');
    }
  });

  it('rejects the empty `{ prose: null }` shape', () => {
    const value: ProseResponse = { prose: null };
    expect(hasProse(value)).toBe(false);
  });
});

describe('hasOptimized', () => {
  it('narrows the record case', () => {
    const value: OptimizedResponse = OPTIMIZED;
    expect(hasOptimized(value)).toBe(true);
    if (hasOptimized(value)) {
      expect(value.payload.roles).toEqual([]);
    }
  });

  it('rejects the empty `{ optimized: null }` shape', () => {
    const value: OptimizedResponse = { optimized: null };
    expect(hasOptimized(value)).toBe(false);
  });
});

describe('GAP_KIND_WEIGHTS / GAP_KIND_LABELS', () => {
  // Both maps must agree on keys — a missing label or weight would render
  // the gap with a fallback string and zero weight, masking real issues.
  it('every weight has a matching label', () => {
    for (const kind of Object.keys(GAP_KIND_WEIGHTS)) {
      expect(GAP_KIND_LABELS[kind]).toBeDefined();
    }
  });

  it('every label has a matching weight', () => {
    for (const kind of Object.keys(GAP_KIND_LABELS)) {
      expect(GAP_KIND_WEIGHTS[kind]).toBeDefined();
    }
  });

  it('weights are non-negative', () => {
    for (const w of Object.values(GAP_KIND_WEIGHTS)) {
      expect(w).toBeGreaterThanOrEqual(0);
    }
  });

  it('outcome.missing_metric is a high-priority (>=3) gap', () => {
    expect(GAP_KIND_WEIGHTS['outcome.missing_metric']).toBeGreaterThanOrEqual(
      3
    );
  });

  it('content.empty has zero weight (sentinel, not a scorable gap)', () => {
    expect(GAP_KIND_WEIGHTS['content.empty']).toBe(0);
  });
});
