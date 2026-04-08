/**
 * Shared style constants for form and interactive components.
 *
 * Centralizes recurring Tailwind class patterns so every form field,
 * button, and dismissible component draws from a single source of truth.
 */

/* ------------------------------------------------------------------ */
/*  Form field base                                                    */
/* ------------------------------------------------------------------ */

/** Label above a form field (Input, Select, Textarea). */
export const FORM_LABEL = 'block text-text-primary mb-2';

/** Required-field asterisk (Input, Textarea). */
export const REQUIRED_MARK = 'text-error ml-1';

/** Shared base for text inputs, selects, and textareas. */
export const BASE_FIELD = [
  'w-full px-4 py-2.5 bg-surface border border-border rounded-md',
  'text-text-primary',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
  'focus-visible:border-transparent transition-all',
].join(' ');

/** Placeholder styling added to free-text fields (Input, Textarea). */
export const FIELD_PLACEHOLDER = 'placeholder:text-text-tertiary';

/* ------------------------------------------------------------------ */
/*  Field state feedback                                               */
/* ------------------------------------------------------------------ */

/** Border + ring override when a field has a validation error. */
export const FIELD_ERROR = 'border-error focus-visible:ring-error';

/** Border + ring override when a field value is confirmed valid. */
export const FIELD_SUCCESS = 'border-success focus-visible:ring-success';

/* ------------------------------------------------------------------ */
/*  Feedback text below a field                                        */
/* ------------------------------------------------------------------ */

/** Error message shown below a field (Input, Select, Textarea). */
export const ERROR_TEXT = 'mt-1.5 text-sm text-error';

/** Helper / hint text shown below a field (Input, Textarea). */
export const HELPER_TEXT = 'mt-1.5 text-sm text-text-tertiary';

/* ------------------------------------------------------------------ */
/*  Disabled states                                                    */
/* ------------------------------------------------------------------ */

/** Standard disabled treatment for directly-disabled elements. */
export const DISABLED = 'disabled:opacity-50 disabled:cursor-not-allowed';

/**
 * Disabled treatment via the `peer` selector — used when the real
 * input is `sr-only` and the visual indicator is a sibling (Checkbox).
 */
export const DISABLED_PEER =
  'peer-disabled:opacity-50 peer-disabled:cursor-not-allowed';

/* ------------------------------------------------------------------ */
/*  Focus ring                                                         */
/* ------------------------------------------------------------------ */

/** Brand-coloured focus ring shared across interactive controls. */
export const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

/** Offset that lifts the ring away from the control surface. */
export const FOCUS_RING_OFFSET =
  'focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

/**
 * Peer-variant focus ring for sr-only inputs whose visual sibling
 * needs to show focus (Checkbox).
 */
export const FOCUS_RING_PEER = [
  'peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500',
  'peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface',
].join(' ');

/* ------------------------------------------------------------------ */
/*  Dismiss / close buttons                                            */
/* ------------------------------------------------------------------ */

/** Hover treatment for icon-only dismiss/close buttons (Alert, Modal, Toast). */
export const DISMISS_BUTTON =
  'text-text-tertiary hover:text-text-primary transition-colors';
