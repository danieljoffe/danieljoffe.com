import {
  axisWeightsEqual,
  formatAxisWeightPercent,
  isDefaultAxisWeights,
  normalizeAxisWeights,
  roundAxisWeight,
} from '../axisWeights';
import { DEFAULT_AXIS_WEIGHTS, type AxisWeights } from '../../types';

describe('normalizeAxisWeights', () => {
  it('returns identical values when weights already sum to 1', () => {
    const out = normalizeAxisWeights(DEFAULT_AXIS_WEIGHTS);
    expect(out).toEqual(DEFAULT_AXIS_WEIGHTS);
  });

  it('renormalizes lopsided weights so the result sums to 1', () => {
    const input: AxisWeights = {
      title_fit: 0.4,
      skills_fit: 0.2,
      seniority_fit: 0.2,
      domain_fit: 0.2,
    };
    const out = normalizeAxisWeights(input);
    const sum =
      out.title_fit + out.skills_fit + out.seniority_fit + out.domain_fit;
    expect(sum).toBeCloseTo(1, 5);
    // 0.4 / (0.4 + 0.2 + 0.2 + 0.2) = 0.4 / 1 = 0.4 (it was already
    // summing to 1 — pick a harder case)
  });

  it('preserves relative proportions when the sum is not 1', () => {
    const input: AxisWeights = {
      title_fit: 0.8,
      skills_fit: 0.4,
      seniority_fit: 0.4,
      domain_fit: 0.4,
    };
    const out = normalizeAxisWeights(input);
    // input ratio is 2:1:1:1 → 0.5 / 0.25 / 0.25 / 0.25
    expect(out.title_fit).toBeCloseTo(0.4, 5);
    expect(out.skills_fit).toBeCloseTo(0.2, 5);
    expect(out.seniority_fit).toBeCloseTo(0.2, 5);
    expect(out.domain_fit).toBeCloseTo(0.2, 5);
  });

  it('falls back to defaults when every weight is zero', () => {
    const input: AxisWeights = {
      title_fit: 0,
      skills_fit: 0,
      seniority_fit: 0,
      domain_fit: 0,
    };
    expect(normalizeAxisWeights(input)).toEqual(DEFAULT_AXIS_WEIGHTS);
  });

  it('handles a single non-zero axis (degenerate but legal)', () => {
    const input: AxisWeights = {
      title_fit: 0.5,
      skills_fit: 0,
      seniority_fit: 0,
      domain_fit: 0,
    };
    const out = normalizeAxisWeights(input);
    expect(out.title_fit).toBeCloseTo(1, 5);
    expect(out.skills_fit).toBeCloseTo(0, 5);
  });
});

describe('roundAxisWeight', () => {
  it('rounds to two decimal places', () => {
    expect(roundAxisWeight(0.30000000000000004)).toBe(0.3);
    expect(roundAxisWeight(0.123456)).toBe(0.12);
    expect(roundAxisWeight(0.125)).toBe(0.13);
  });
});

describe('formatAxisWeightPercent', () => {
  it('renders a 0–1 weight as a whole-number percent', () => {
    expect(formatAxisWeightPercent(0.25)).toBe('25%');
    expect(formatAxisWeightPercent(0)).toBe('0%');
    expect(formatAxisWeightPercent(1)).toBe('100%');
    // Rounding: 0.255 → 26%, not 25%.
    expect(formatAxisWeightPercent(0.255)).toBe('26%');
  });
});

describe('isDefaultAxisWeights', () => {
  it('is true for the default quartile', () => {
    expect(isDefaultAxisWeights(DEFAULT_AXIS_WEIGHTS)).toBe(true);
  });
  it('is false when any axis is off the default', () => {
    expect(
      isDefaultAxisWeights({ ...DEFAULT_AXIS_WEIGHTS, title_fit: 0.3 })
    ).toBe(false);
  });
});

describe('axisWeightsEqual', () => {
  it('treats float noise within 2 decimals as equal', () => {
    const a: AxisWeights = {
      title_fit: 0.3,
      skills_fit: 0.2,
      seniority_fit: 0.2,
      domain_fit: 0.3,
    };
    const b: AxisWeights = {
      title_fit: 0.30000000001,
      skills_fit: 0.2,
      seniority_fit: 0.2,
      domain_fit: 0.3,
    };
    expect(axisWeightsEqual(a, b)).toBe(true);
  });
  it('detects real changes', () => {
    expect(
      axisWeightsEqual(DEFAULT_AXIS_WEIGHTS, {
        ...DEFAULT_AXIS_WEIGHTS,
        domain_fit: 0.5,
      })
    ).toBe(false);
  });
});
