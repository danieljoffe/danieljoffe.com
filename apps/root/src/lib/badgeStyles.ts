export const badgeBase =
  'inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium';

export const badgeVariants: Record<string, string> = {
  success: `${badgeBase} bg-success-light text-success border border-success/30`,
  warning: `${badgeBase} bg-warning-light text-warning border border-warning/30`,
  error: `${badgeBase} bg-error-light text-error border border-error/30`,
  info: `${badgeBase} bg-info-light text-info border border-info/30`,
  brand: `${badgeBase} bg-brand-50 text-brand-700`,
  'brand-solid': `${badgeBase} bg-brand-600 text-white`,
  default: `${badgeBase} bg-surface-elevated text-text-secondary border border-border`,
};
