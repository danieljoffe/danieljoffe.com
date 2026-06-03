import {
  AXIS_KEYS,
  DEFAULT_AXIS_WEIGHTS,
  type AxisKey,
  type AxisWeights,
} from '../types';

/** Slider granularity (5% increments) — same step the UI exposes. */
export const AXIS_WEIGHT_STEP = 0.05;
export const AXIS_WEIGHT_MIN = 0;
export const AXIS_WEIGHT_MAX = 1;

/**
 * Normalize a set of axis weights to sum to 1.
 *
 * The backend does this at read time (see `display_score_or_passthrough`
 * in wyrdfold-api). We mirror the math here so the UI can show the user
 * exactly what their slider positions will mean once applied.
 *
 * Edge case: if the user drags every slider to zero the sum is zero;
 * rather than divide-by-zero, fall back to defaults (equal quartile).
 * This matches the backend's intent — a NULL/defaults row also produces
 * an equal blend.
 */
export function normalizeAxisWeights(weights: AxisWeights): AxisWeights {
  const sum =
    weights.title_fit +
    weights.skills_fit +
    weights.seniority_fit +
    weights.domain_fit;

  if (sum <= 0) {
    return { ...DEFAULT_AXIS_WEIGHTS };
  }

  return {
    title_fit: weights.title_fit / sum,
    skills_fit: weights.skills_fit / sum,
    seniority_fit: weights.seniority_fit / sum,
    domain_fit: weights.domain_fit / sum,
  };
}

/** Round to 2 decimal places so display "0.30000000000004" doesn't leak. */
export function roundAxisWeight(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Render a weight (0–1) as a whole-number percentage string ("25%"). */
export function formatAxisWeightPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/**
 * Are these weights the defaults (equal quartile)? Used to decide
 * whether to display a "no override" badge — but NOT to skip submission;
 * the backend treats defaults identically to NULL.
 */
export function isDefaultAxisWeights(weights: AxisWeights): boolean {
  return AXIS_KEYS.every(
    (k: AxisKey) => roundAxisWeight(weights[k]) === DEFAULT_AXIS_WEIGHTS[k]
  );
}

/** Stable equality check for "is the current draft different from the saved row". */
export function axisWeightsEqual(a: AxisWeights, b: AxisWeights): boolean {
  return AXIS_KEYS.every(
    (k: AxisKey) => roundAxisWeight(a[k]) === roundAxisWeight(b[k])
  );
}

/** Human label for each axis — shared between slider label and preview row. */
export const AXIS_LABELS: Record<AxisKey, string> = {
  title_fit: 'Title fit',
  skills_fit: 'Skills fit',
  seniority_fit: 'Seniority fit',
  domain_fit: 'Domain fit',
};

/**
 * One-line explanation per axis. Surfaced as helper text under each
 * slider so users have at least a hint of what they're tuning before
 * they drag (the "what does title_fit even mean" question).
 */
export const AXIS_HINTS: Record<AxisKey, string> = {
  title_fit: 'How closely the job title matches your target role.',
  skills_fit: 'Overlap between the JD requirements and your skills.',
  seniority_fit: 'Whether the role level matches what you are targeting.',
  domain_fit: 'How well the industry or product domain matches.',
};
