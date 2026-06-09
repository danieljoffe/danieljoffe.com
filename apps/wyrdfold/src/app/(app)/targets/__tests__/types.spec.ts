import { emptyScoringProfile, toSummary, type JobTarget } from '../types';

function makeFullTarget(
  categories: JobTarget['scoring_profile']['categories']
): JobTarget {
  return {
    id: 't-1',
    label: 'Senior Frontend Engineer',
    description: 'desc',
    normalized_label: 'senior frontend engineer',
    scoring_profile: { ...emptyScoringProfile(), categories },
    search_keywords: ['react', 'typescript'],
    activation_status: 'ready',
    profile_version: 2,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-04-30T00:00:00Z',
  };
}

describe('toSummary', () => {
  it('sums keyword counts across all categories', () => {
    const summary = toSummary(
      makeFullTarget({
        frontend: { keywords: { react: 3, typescript: 2 }, weight: 1 },
        tooling: { keywords: { vite: 1 }, weight: 0.5 },
      })
    );
    expect(summary.keyword_count).toBe(3);
    expect(summary.category_count).toBe(2);
  });

  it('collapses an empty profile to 0/0', () => {
    const summary = toSummary(makeFullTarget({}));
    expect(summary.keyword_count).toBe(0);
    expect(summary.category_count).toBe(0);
  });

  it('carries the light fields through and drops the heavy ones', () => {
    const summary = toSummary(
      makeFullTarget({ frontend: { keywords: { react: 3 }, weight: 1 } })
    );
    expect(summary.id).toBe('t-1');
    expect(summary.label).toBe('Senior Frontend Engineer');
    expect(summary.activation_status).toBe('ready');
    expect(summary.profile_version).toBe(2);
    // The heavy JSONB never appears on the summary shape.
    expect('scoring_profile' in summary).toBe(false);
    expect('search_keywords' in summary).toBe(false);
  });
});

describe('emptyScoringProfile', () => {
  it('returns an empty categories map', () => {
    const profile = emptyScoringProfile();
    expect(profile.categories).toEqual({});
  });

  it('seeds seniority with null level + empty signals', () => {
    const profile = emptyScoringProfile();
    expect(profile.seniority).toEqual({ level: null, signals: [] });
  });

  it('seeds the domain profile with weight 0.5', () => {
    const profile = emptyScoringProfile();
    expect(profile.domain.weight).toBe(0.5);
    expect(profile.domain.signals).toEqual([]);
  });

  // The negative weight is intentionally large and negative — a positive or
  // small value would let "negative" keywords *boost* a job's score, which
  // defeats the whole point of the negative bucket.
  it('seeds the negative profile with weight -10', () => {
    const profile = emptyScoringProfile();
    expect(profile.negative.weight).toBe(-10);
    expect(profile.negative.keywords).toEqual([]);
  });

  it('returns a fresh object on each call (no shared references)', () => {
    const a = emptyScoringProfile();
    const b = emptyScoringProfile();
    expect(a).not.toBe(b);
    expect(a.categories).not.toBe(b.categories);
    expect(a.seniority.signals).not.toBe(b.seniority.signals);
    expect(a.domain.signals).not.toBe(b.domain.signals);
    expect(a.negative.keywords).not.toBe(b.negative.keywords);
  });
});
