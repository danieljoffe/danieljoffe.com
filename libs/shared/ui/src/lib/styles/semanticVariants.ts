/**
 * Shared semantic color variant system.
 *
 * The four-point semantic scale (info / success / warning / error) recurs
 * across Alert, Badge, Spinner, and Toast. This module provides atomic
 * building blocks so each component composes its variant styles from a
 * single source of truth.
 */

/* ------------------------------------------------------------------ */
/*  Base type                                                          */
/* ------------------------------------------------------------------ */

/** The four-point semantic variant scale shared across the library. */
export type SemanticVariant = 'info' | 'success' | 'warning' | 'error';

/* ------------------------------------------------------------------ */
/*  Atomic color tokens                                                */
/* ------------------------------------------------------------------ */

/** Semantic text colors (Alert, Badge, Toast icon coloring). */
export const SEMANTIC_TEXT: Record<SemanticVariant, string> = {
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
};

/** Light semantic backgrounds (Alert, Badge). */
export const SEMANTIC_BG_LIGHT: Record<SemanticVariant, string> = {
  info: 'bg-info-light',
  success: 'bg-success-light',
  warning: 'bg-warning-light',
  error: 'bg-error-light',
};

/** Semantic border colors at 30% opacity (Alert, Badge, Spinner). */
export const SEMANTIC_BORDER: Record<SemanticVariant, string> = {
  info: 'border-info/30',
  success: 'border-success/30',
  warning: 'border-warning/30',
  error: 'border-error/30',
};

/* ------------------------------------------------------------------ */
/*  Composed patterns                                                  */
/* ------------------------------------------------------------------ */

/**
 * Spinner border pattern: translucent ring + solid top edge.
 * Used by Spinner component for its semantic variants.
 */
export const SEMANTIC_SPINNER: Record<SemanticVariant, string> = {
  info: `${SEMANTIC_BORDER.info} border-t-info`,
  success: `${SEMANTIC_BORDER.success} border-t-success`,
  warning: `${SEMANTIC_BORDER.warning} border-t-warning`,
  error: `${SEMANTIC_BORDER.error} border-t-error`,
};
