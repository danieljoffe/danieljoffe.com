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
 * Ordered palette for multi-series charts. Add more as needed.
 */
export const SERIES_PALETTE = [
  CHART_COLORS.brand,
  CHART_COLORS.success,
  CHART_COLORS.warning,
  CHART_COLORS.info,
  CHART_COLORS.error,
  CHART_COLORS.brandLight,
] as const;
