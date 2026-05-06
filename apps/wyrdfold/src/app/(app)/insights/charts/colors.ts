import type { JobStatus } from '../../jobs/types';

/**
 * Chart color tokens.
 *
 * recharts needs explicit color values (not CSS variables), so we duplicate
 * the brand palette here.  Values sourced from theme.css @theme block.
 */
export const CHART_COLORS = {
  brand: 'oklch(0.54 0.19 250)', // brand-500
  brandLight: 'oklch(0.68 0.15 250)', // brand-400
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#2563eb',
  muted: '#6b7280', // text-secondary
  grid: '#e5e7eb', // border
} as const;

/**
 * Per-status chart fill, matching the colored dots and badges used elsewhere.
 */
export const STATUS_CHART_COLOR: Record<JobStatus, string> = {
  new: CHART_COLORS.muted,
  saved: CHART_COLORS.info,
  resume_draft: CHART_COLORS.info,
  resume_ready: CHART_COLORS.success,
  applied: CHART_COLORS.success,
  interviewing: CHART_COLORS.warning,
  offer: CHART_COLORS.warning,
  rejected: CHART_COLORS.error,
  archived: CHART_COLORS.muted,
};
