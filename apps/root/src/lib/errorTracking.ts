/**
 * Centralized Error Tracking Utility
 *
 * Provides standardized error capture and reporting to Sentry with
 * consistent tagging, context, and severity levels.
 */

import * as Sentry from '@sentry/nextjs';

type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info';

type ErrorCategory =
  | 'render' // React component render errors
  | 'api' // API route errors
  | 'form' // Form submission errors
  | 'network' // Network/fetch errors
  | 'validation' // Input validation errors
  | 'auth' // Authentication errors
  | 'config' // Configuration errors
  | 'unknown'; // Uncategorized errors

interface ErrorContext {
  category: ErrorCategory;
  severity?: ErrorSeverity;
  component?: string;
  action?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Captures an error to Sentry with standardized context and tagging.
 *
 * @param error - The error object to capture
 * @param context - Additional context about where/how the error occurred
 *
 * @example
 * ```typescript
 * captureError(error, {
 *   category: 'form',
 *   component: 'ContactForm',
 *   action: 'submit',
 *   metadata: { formId: 'contact' }
 * });
 * ```
 */
export function captureError(
  error: Error | unknown,
  context: ErrorContext
): void {
  const {
    category,
    severity = 'error',
    component,
    action,
    userId,
    metadata,
  } = context;

  Sentry.withScope(scope => {
    // Set error level
    scope.setLevel(severity);

    // Set standard tags for filtering in Sentry dashboard
    scope.setTag('error.category', category);
    if (component) scope.setTag('component', component);
    if (action) scope.setTag('action', action);

    // Set user context if available
    if (userId) {
      scope.setUser({ id: userId });
    }

    // Add extra context data
    if (metadata) {
      scope.setExtras(metadata);
    }

    // Add fingerprint for grouping similar errors
    const fingerprint: string[] = [category];
    if (component) fingerprint.push(component);
    if (action) fingerprint.push(action);
    scope.setFingerprint(fingerprint);

    // Capture the error
    if (error instanceof Error) {
      Sentry.captureException(error);
    } else {
      Sentry.captureMessage(String(error), severity);
    }
  });
}

/**
 * Captures a React Error Boundary error with component stack trace.
 *
 * @param error - The error thrown during render
 * @param errorInfo - React's error info containing component stack
 * @param componentName - Name of the ErrorBoundary or wrapper component
 */
export function captureRenderError(
  error: Error,
  errorInfo: React.ErrorInfo,
  componentName = 'ErrorBoundary'
): void {
  Sentry.withScope(scope => {
    scope.setLevel('error');
    scope.setTag('error.category', 'render');
    scope.setTag('component', componentName);

    // Add React component stack as context
    scope.setContext('react', {
      componentStack: errorInfo.componentStack,
    });

    // Fingerprint by error message and component for grouping
    scope.setFingerprint(['render', componentName, error.message]);

    Sentry.captureException(error);
  });
}

/**
 * Captures an API route error with request context.
 *
 * @param error - The error that occurred
 * @param route - The API route path (e.g., '/api/email')
 * @param method - HTTP method (GET, POST, etc.)
 * @param statusCode - HTTP status code returned
 * @param metadata - Additional request context
 */
export function captureApiError(
  error: Error | unknown,
  route: string,
  method: string,
  statusCode: number,
  metadata?: Record<string, unknown>
): void {
  // Handle client errors (4xx)
  if (statusCode >= 400 && statusCode < 500) {
    // Auth failures are more significant than general validation errors
    const isAuthError = statusCode === 401 || statusCode === 403;
    const level: ErrorSeverity = isAuthError ? 'warning' : 'info';
    const category: ErrorCategory = isAuthError ? 'auth' : 'validation';

    Sentry.withScope(scope => {
      scope.setLevel(level);
      scope.setTag('error.category', category);
      scope.setTag('api.route', route);
      scope.setTag('api.method', method);
      scope.setTag('http.status_code', statusCode.toString());

      if (metadata) {
        scope.setExtras(metadata);
      }

      if (error instanceof Error) {
        Sentry.captureMessage(`Client error: ${error.message}`, level);
      }
    });
    return;
  }

  // Capture server errors (5xx) as actual errors
  captureError(error, {
    category: 'api',
    severity: statusCode >= 500 ? 'error' : 'warning',
    action: `${method} ${route}`,
    metadata: {
      ...metadata,
      statusCode,
      route,
      method,
    },
  });
}

/**
 * Captures a form submission error.
 *
 * @param formId - Identifier for the form
 * @param error - The error that occurred
 * @param fieldErrors - Any field-specific validation errors
 */
export function captureFormError(
  formId: string,
  error: Error | unknown,
  fieldErrors?: Record<string, string>
): void {
  captureError(error, {
    category: 'form',
    severity: 'warning',
    component: formId,
    action: 'submit',
    metadata: {
      formId,
      fieldErrors,
    },
  });
}

/**
 * Captures a network/fetch error.
 *
 * @param url - The URL that failed
 * @param error - The error that occurred
 * @param method - HTTP method used
 */
export function captureNetworkError(
  url: string,
  error: Error | unknown,
  method = 'GET'
): void {
  captureError(error, {
    category: 'network',
    severity: 'warning',
    action: `${method} ${url}`,
    metadata: {
      url,
      method,
    },
  });
}

/**
 * Sets the current user context for all subsequent error captures.
 * Call this when a user logs in or their identity is known.
 *
 * @param userId - Unique user identifier
 * @param email - User's email (optional)
 * @param additionalData - Any additional user data
 */
export function setUserContext(
  userId: string,
  email?: string,
  additionalData?: Record<string, unknown>
): void {
  const user: { id: string; email?: string } & Record<string, unknown> = {
    id: userId,
    ...additionalData,
  };
  if (email) {
    user.email = email;
  }
  Sentry.setUser(user);
}

/**
 * Clears the current user context.
 * Call this when a user logs out.
 */
export function clearUserContext(): void {
  Sentry.setUser(null);
}

/**
 * Adds a breadcrumb for tracking user actions leading up to an error.
 *
 * @param message - Description of the action
 * @param category - Category of the breadcrumb
 * @param data - Additional data to attach
 */
export function addBreadcrumb(
  message: string,
  category = 'user',
  data?: Record<string, unknown>
): void {
  const breadcrumb: Sentry.Breadcrumb = {
    message,
    category,
    level: 'info',
  };
  if (data) {
    breadcrumb.data = data;
  }
  Sentry.addBreadcrumb(breadcrumb);
}

/**
 * Creates a performance transaction span for measuring operations.
 *
 * @param name - Name of the operation
 * @param op - Operation type (e.g., 'http.client', 'db.query')
 * @param callback - The operation to measure
 * @returns The result of the callback
 */
export async function withSpan<T>(
  name: string,
  op: string,
  callback: () => Promise<T>
): Promise<T> {
  return Sentry.startSpan({ name, op }, async () => {
    return callback();
  });
}
