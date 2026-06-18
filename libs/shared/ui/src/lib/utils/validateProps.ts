/**
 * Development-only prop validation helper.
 * Logs errors in development, silently falls back to defaults in production.
 */
export function validateProps<T extends Record<string, unknown>>(
  props: T,
  validate: (props: T) => string | null,
  defaults: Partial<T>,
  componentName: string
): T {
  const error = validate(props);

  if (error) {
    if (
      typeof process !== 'undefined' &&
      process.env['NODE_ENV'] === 'development'
    ) {
      console.error(`[${componentName}] Invalid props: ${error}`);
    }
    return { ...defaults, ...props } as T;
  }

  return props;
}
