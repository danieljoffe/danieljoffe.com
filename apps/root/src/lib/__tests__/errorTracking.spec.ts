import * as Sentry from '@sentry/nextjs';

import {
  captureError,
  captureRenderError,
  captureApiError,
  captureFormError,
  captureNetworkError,
  setUserContext,
  clearUserContext,
  addBreadcrumb,
  withSpan,
} from '../errorTracking';

jest.mock('@sentry/nextjs', () => {
  const mockScope = {
    setLevel: jest.fn(),
    setTag: jest.fn(),
    setUser: jest.fn(),
    setExtras: jest.fn(),
    setContext: jest.fn(),
    setFingerprint: jest.fn(),
  };
  return {
    withScope: jest.fn((cb: (scope: typeof mockScope) => void) =>
      cb(mockScope)
    ),
    captureException: jest.fn(),
    captureMessage: jest.fn(),
    setUser: jest.fn(),
    addBreadcrumb: jest.fn(),
    startSpan: jest.fn((_opts: unknown, cb: () => unknown) => cb()),
    __mockScope: mockScope,
  };
});

const mockScope = (
  Sentry as unknown as { __mockScope: Record<string, jest.Mock> }
).__mockScope;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('errorTracking', () => {
  // ---------------------------------------------------------------------------
  // captureError
  // ---------------------------------------------------------------------------
  describe('captureError', () => {
    it('sets severity to "error" by default when severity is omitted', () => {
      const error = new Error('test');
      captureError(error, { category: 'unknown' });

      expect(mockScope.setLevel).toHaveBeenCalledWith('error');
    });

    it('uses a custom severity when provided', () => {
      captureError(new Error('test'), {
        category: 'unknown',
        severity: 'fatal',
      });

      expect(mockScope.setLevel).toHaveBeenCalledWith('fatal');
    });

    it('sets the error.category tag', () => {
      captureError(new Error('test'), { category: 'form' });

      expect(mockScope.setTag).toHaveBeenCalledWith('error.category', 'form');
    });

    // Branch: component provided vs not
    it('sets component tag when component is provided', () => {
      captureError(new Error('test'), {
        category: 'unknown',
        component: 'Header',
      });

      expect(mockScope.setTag).toHaveBeenCalledWith('component', 'Header');
    });

    it('does NOT set component tag when component is omitted', () => {
      captureError(new Error('test'), { category: 'unknown' });

      const componentCalls = (mockScope.setTag as jest.Mock).mock.calls.filter(
        (c: string[]) => c[0] === 'component'
      );
      expect(componentCalls).toHaveLength(0);
    });

    // Branch: action provided vs not
    it('sets action tag when action is provided', () => {
      captureError(new Error('test'), { category: 'unknown', action: 'click' });

      expect(mockScope.setTag).toHaveBeenCalledWith('action', 'click');
    });

    it('does NOT set action tag when action is omitted', () => {
      captureError(new Error('test'), { category: 'unknown' });

      const actionCalls = (mockScope.setTag as jest.Mock).mock.calls.filter(
        (c: string[]) => c[0] === 'action'
      );
      expect(actionCalls).toHaveLength(0);
    });

    // Branch: userId provided vs not
    it('sets user context when userId is provided', () => {
      captureError(new Error('test'), { category: 'unknown', userId: 'u123' });

      expect(mockScope.setUser).toHaveBeenCalledWith({ id: 'u123' });
    });

    it('does NOT set user context when userId is omitted', () => {
      captureError(new Error('test'), { category: 'unknown' });

      expect(mockScope.setUser).not.toHaveBeenCalled();
    });

    // Branch: metadata provided vs not
    it('sets extras when metadata is provided', () => {
      const metadata = { key: 'value' };
      captureError(new Error('test'), { category: 'unknown', metadata });

      expect(mockScope.setExtras).toHaveBeenCalledWith(metadata);
    });

    it('does NOT set extras when metadata is omitted', () => {
      captureError(new Error('test'), { category: 'unknown' });

      expect(mockScope.setExtras).not.toHaveBeenCalled();
    });

    // Fingerprint: category only
    it('sets fingerprint with only category when component and action are omitted', () => {
      captureError(new Error('test'), { category: 'network' });

      expect(mockScope.setFingerprint).toHaveBeenCalledWith(['network']);
    });

    // Fingerprint: category + component + action
    it('includes component and action in fingerprint when provided', () => {
      captureError(new Error('test'), {
        category: 'form',
        component: 'ContactForm',
        action: 'submit',
      });

      expect(mockScope.setFingerprint).toHaveBeenCalledWith([
        'form',
        'ContactForm',
        'submit',
      ]);
    });

    // Branch: error instanceof Error => captureException
    it('calls captureException when error is an Error instance', () => {
      const err = new Error('something broke');
      captureError(err, { category: 'unknown' });

      expect(Sentry.captureException).toHaveBeenCalledWith(err);
      expect(Sentry.captureMessage).not.toHaveBeenCalled();
    });

    // Branch: error is NOT an Error => captureMessage
    it('calls captureMessage when error is a string', () => {
      captureError('string error', { category: 'unknown' });

      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        'string error',
        'error'
      );
      expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it('calls captureMessage with custom severity when error is not an Error', () => {
      captureError('oops', { category: 'unknown', severity: 'warning' });

      expect(Sentry.captureMessage).toHaveBeenCalledWith('oops', 'warning');
    });

    // All optional fields together
    it('handles all optional fields together', () => {
      const err = new Error('full');
      captureError(err, {
        category: 'api',
        severity: 'fatal',
        component: 'Fetcher',
        action: 'load',
        userId: 'u456',
        metadata: { extra: true },
      });

      expect(mockScope.setLevel).toHaveBeenCalledWith('fatal');
      expect(mockScope.setTag).toHaveBeenCalledWith('error.category', 'api');
      expect(mockScope.setTag).toHaveBeenCalledWith('component', 'Fetcher');
      expect(mockScope.setTag).toHaveBeenCalledWith('action', 'load');
      expect(mockScope.setUser).toHaveBeenCalledWith({ id: 'u456' });
      expect(mockScope.setExtras).toHaveBeenCalledWith({ extra: true });
      expect(mockScope.setFingerprint).toHaveBeenCalledWith([
        'api',
        'Fetcher',
        'load',
      ]);
      expect(Sentry.captureException).toHaveBeenCalledWith(err);
    });
  });

  // ---------------------------------------------------------------------------
  // captureRenderError
  // ---------------------------------------------------------------------------
  describe('captureRenderError', () => {
    const renderError = new Error('render failed');
    const errorInfo: React.ErrorInfo = {
      componentStack: '\n    in BrokenComponent\n    in App',
      digest: undefined,
    };

    it('uses default componentName "ErrorBoundary" when not provided', () => {
      captureRenderError(renderError, errorInfo);

      expect(mockScope.setTag).toHaveBeenCalledWith(
        'component',
        'ErrorBoundary'
      );
      expect(mockScope.setFingerprint).toHaveBeenCalledWith([
        'render',
        'ErrorBoundary',
        'render failed',
      ]);
    });

    it('uses a custom componentName when provided', () => {
      captureRenderError(renderError, errorInfo, 'CustomBoundary');

      expect(mockScope.setTag).toHaveBeenCalledWith(
        'component',
        'CustomBoundary'
      );
      expect(mockScope.setFingerprint).toHaveBeenCalledWith([
        'render',
        'CustomBoundary',
        'render failed',
      ]);
    });

    it('sets level to "error" and category to "render"', () => {
      captureRenderError(renderError, errorInfo);

      expect(mockScope.setLevel).toHaveBeenCalledWith('error');
      expect(mockScope.setTag).toHaveBeenCalledWith('error.category', 'render');
    });

    it('sets react context with componentStack', () => {
      captureRenderError(renderError, errorInfo);

      expect(mockScope.setContext).toHaveBeenCalledWith('react', {
        componentStack: errorInfo.componentStack,
      });
    });

    it('calls captureException with the error', () => {
      captureRenderError(renderError, errorInfo);

      expect(Sentry.captureException).toHaveBeenCalledWith(renderError);
    });
  });

  // ---------------------------------------------------------------------------
  // captureApiError
  // ---------------------------------------------------------------------------
  describe('captureApiError', () => {
    // Branch: 4xx - auth error (401)
    it('treats 401 as an auth warning', () => {
      const err = new Error('Unauthorized');
      captureApiError(err, '/api/data', 'GET', 401);

      expect(mockScope.setLevel).toHaveBeenCalledWith('warning');
      expect(mockScope.setTag).toHaveBeenCalledWith('error.category', 'auth');
      expect(mockScope.setTag).toHaveBeenCalledWith('http.status_code', '401');
      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        'Client error: Unauthorized',
        'warning'
      );
    });

    // Branch: 4xx - auth error (403)
    it('treats 403 as an auth warning', () => {
      const err = new Error('Forbidden');
      captureApiError(err, '/api/admin', 'POST', 403);

      expect(mockScope.setLevel).toHaveBeenCalledWith('warning');
      expect(mockScope.setTag).toHaveBeenCalledWith('error.category', 'auth');
      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        'Client error: Forbidden',
        'warning'
      );
    });

    // Branch: 4xx - non-auth (404) => validation / info
    it('treats 404 as a validation info', () => {
      const err = new Error('Not Found');
      captureApiError(err, '/api/items/99', 'GET', 404);

      expect(mockScope.setLevel).toHaveBeenCalledWith('info');
      expect(mockScope.setTag).toHaveBeenCalledWith(
        'error.category',
        'validation'
      );
      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        'Client error: Not Found',
        'info'
      );
    });

    // Branch: 4xx with metadata
    it('sets extras when metadata is provided for client errors', () => {
      const meta = { requestId: 'abc' };
      captureApiError(new Error('Bad'), '/api/data', 'POST', 400, meta);

      expect(mockScope.setExtras).toHaveBeenCalledWith(meta);
    });

    // Branch: 4xx without metadata
    it('does NOT set extras when metadata is omitted for client errors', () => {
      captureApiError(new Error('Bad'), '/api/data', 'POST', 400);

      expect(mockScope.setExtras).not.toHaveBeenCalled();
    });

    // Branch: 4xx with non-Error (does NOT call captureMessage)
    it('does NOT call captureMessage when error is not an Error for client errors', () => {
      captureApiError('string error', '/api/data', 'GET', 400);

      expect(Sentry.captureMessage).not.toHaveBeenCalled();
    });

    // Branch: 4xx sets route and method tags
    it('sets api.route and api.method tags for client errors', () => {
      captureApiError(new Error('test'), '/api/users', 'DELETE', 422);

      expect(mockScope.setTag).toHaveBeenCalledWith('api.route', '/api/users');
      expect(mockScope.setTag).toHaveBeenCalledWith('api.method', 'DELETE');
    });

    // Branch: 5xx - server error => delegates to captureError with severity 'error'
    it('delegates 500 errors to captureError with severity "error"', () => {
      const err = new Error('Internal Server Error');
      captureApiError(err, '/api/data', 'POST', 500, { extra: 'info' });

      // captureError is called which calls withScope
      expect(Sentry.withScope).toHaveBeenCalled();
      expect(mockScope.setLevel).toHaveBeenCalledWith('error');
      expect(mockScope.setTag).toHaveBeenCalledWith('error.category', 'api');
      expect(mockScope.setTag).toHaveBeenCalledWith('action', 'POST /api/data');
      expect(mockScope.setExtras).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          route: '/api/data',
          method: 'POST',
          extra: 'info',
        })
      );
      expect(Sentry.captureException).toHaveBeenCalledWith(err);
    });

    // Branch: statusCode < 400 (e.g. 302) - falls through to captureError with severity 'warning'
    it('delegates non-4xx/5xx status codes to captureError with severity "warning"', () => {
      const err = new Error('Redirect issue');
      captureApiError(err, '/api/redirect', 'GET', 302);

      expect(mockScope.setLevel).toHaveBeenCalledWith('warning');
      expect(mockScope.setTag).toHaveBeenCalledWith('error.category', 'api');
      expect(Sentry.captureException).toHaveBeenCalledWith(err);
    });

    // 5xx without metadata
    it('delegates 503 to captureError without extra metadata', () => {
      captureApiError(new Error('Unavailable'), '/api/health', 'GET', 503);

      expect(mockScope.setExtras).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 503,
          route: '/api/health',
          method: 'GET',
        })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // captureFormError
  // ---------------------------------------------------------------------------
  describe('captureFormError', () => {
    it('delegates to captureError with form category and formId as component', () => {
      const err = new Error('Validation failed');
      captureFormError('contact-form', err, { name: 'required' });

      expect(mockScope.setLevel).toHaveBeenCalledWith('warning');
      expect(mockScope.setTag).toHaveBeenCalledWith('error.category', 'form');
      expect(mockScope.setTag).toHaveBeenCalledWith(
        'component',
        'contact-form'
      );
      expect(mockScope.setTag).toHaveBeenCalledWith('action', 'submit');
      expect(mockScope.setExtras).toHaveBeenCalledWith({
        formId: 'contact-form',
        fieldErrors: { name: 'required' },
      });
      expect(Sentry.captureException).toHaveBeenCalledWith(err);
    });

    it('works without fieldErrors', () => {
      captureFormError('login-form', new Error('fail'));

      expect(mockScope.setExtras).toHaveBeenCalledWith({
        formId: 'login-form',
        fieldErrors: undefined,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // captureNetworkError
  // ---------------------------------------------------------------------------
  describe('captureNetworkError', () => {
    it('uses default method "GET" when method is omitted', () => {
      captureNetworkError('https://api.example.com/data', new Error('timeout'));

      expect(mockScope.setTag).toHaveBeenCalledWith(
        'action',
        'GET https://api.example.com/data'
      );
      expect(mockScope.setExtras).toHaveBeenCalledWith({
        url: 'https://api.example.com/data',
        method: 'GET',
      });
    });

    it('uses custom method when provided', () => {
      captureNetworkError(
        'https://api.example.com/data',
        new Error('timeout'),
        'POST'
      );

      expect(mockScope.setTag).toHaveBeenCalledWith(
        'action',
        'POST https://api.example.com/data'
      );
      expect(mockScope.setExtras).toHaveBeenCalledWith({
        url: 'https://api.example.com/data',
        method: 'POST',
      });
    });

    it('sets category to "network" and severity to "warning"', () => {
      captureNetworkError('/endpoint', new Error('fail'));

      expect(mockScope.setTag).toHaveBeenCalledWith(
        'error.category',
        'network'
      );
      expect(mockScope.setLevel).toHaveBeenCalledWith('warning');
    });
  });

  // ---------------------------------------------------------------------------
  // setUserContext
  // ---------------------------------------------------------------------------
  describe('setUserContext', () => {
    it('sets user with only userId', () => {
      setUserContext('user-1');

      expect(Sentry.setUser).toHaveBeenCalledWith({ id: 'user-1' });
    });

    it('includes email when provided', () => {
      setUserContext('user-2', 'user@example.com');

      expect(Sentry.setUser).toHaveBeenCalledWith({
        id: 'user-2',
        email: 'user@example.com',
      });
    });

    it('does NOT include email when omitted', () => {
      setUserContext('user-3');

      const call = (Sentry.setUser as jest.Mock).mock.calls[0][0];
      expect(call).not.toHaveProperty('email');
    });

    it('spreads additionalData into user object', () => {
      setUserContext('user-4', undefined, { role: 'admin', org: 'acme' });

      expect(Sentry.setUser).toHaveBeenCalledWith({
        id: 'user-4',
        role: 'admin',
        org: 'acme',
      });
    });

    it('includes email AND additionalData when both are provided', () => {
      setUserContext('user-5', 'a@b.com', { plan: 'pro' });

      expect(Sentry.setUser).toHaveBeenCalledWith({
        id: 'user-5',
        email: 'a@b.com',
        plan: 'pro',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // clearUserContext
  // ---------------------------------------------------------------------------
  describe('clearUserContext', () => {
    it('calls Sentry.setUser with null', () => {
      clearUserContext();

      expect(Sentry.setUser).toHaveBeenCalledWith(null);
    });
  });

  // ---------------------------------------------------------------------------
  // addBreadcrumb
  // ---------------------------------------------------------------------------
  describe('addBreadcrumb', () => {
    it('uses default category "user" when not provided', () => {
      addBreadcrumb('clicked button');

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        message: 'clicked button',
        category: 'user',
        level: 'info',
      });
    });

    it('uses custom category when provided', () => {
      addBreadcrumb('fetched data', 'http');

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        message: 'fetched data',
        category: 'http',
        level: 'info',
      });
    });

    it('includes data when provided', () => {
      addBreadcrumb('navigation', 'nav', { from: '/home', to: '/about' });

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        message: 'navigation',
        category: 'nav',
        level: 'info',
        data: { from: '/home', to: '/about' },
      });
    });

    it('does NOT include data property when data is omitted', () => {
      addBreadcrumb('simple');

      const call = (Sentry.addBreadcrumb as jest.Mock).mock.calls[0][0];
      expect(call).not.toHaveProperty('data');
    });
  });

  // ---------------------------------------------------------------------------
  // withSpan
  // ---------------------------------------------------------------------------
  describe('withSpan', () => {
    it('calls Sentry.startSpan with name and op', async () => {
      await withSpan('load-data', 'http.client', async () => 'result');

      expect(Sentry.startSpan).toHaveBeenCalledWith(
        { name: 'load-data', op: 'http.client' },
        expect.any(Function)
      );
    });

    it('returns the result of the callback', async () => {
      const result = await withSpan('compute', 'task', async () => 42);

      expect(result).toBe(42);
    });

    it('propagates errors from the callback', async () => {
      await expect(
        withSpan('fail', 'task', async () => {
          throw new Error('callback failed');
        })
      ).rejects.toThrow('callback failed');
    });
  });
});
