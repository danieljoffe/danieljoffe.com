export const badgeBase =
  'inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium';

export const badgeVariants: Record<string, string> = {
  success: `${badgeBase} bg-success-light text-success border border-success/30`,
  warning: `${badgeBase} bg-warning-light text-warning border border-warning/30`,
  error: `${badgeBase} bg-error-light text-error border border-error/30`,
  default: `${badgeBase} bg-surface-elevated text-text-secondary border border-border`,
};
