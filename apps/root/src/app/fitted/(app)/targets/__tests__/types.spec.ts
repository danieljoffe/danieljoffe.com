import { emptyScoringProfile } from '../types';

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
