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
} from './errorTracking';

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

describe('captureError', () => {
  it('captures an Error instance with context', () => {
    const error = new Error('test error');
    captureError(error, {
      category: 'render',
      severity: 'fatal',
      component: 'App',
      action: 'mount',
      userId: 'user-1',
      metadata: { key: 'value' },
    });

    expect(mockScope.setLevel).toHaveBeenCalledWith('fatal');
    expect(mockScope.setTag).toHaveBeenCalledWith('error.category', 'render');
    expect(mockScope.setTag).toHaveBeenCalledWith('component', 'App');
    expect(mockScope.setTag).toHaveBeenCalledWith('action', 'mount');
    expect(mockScope.setUser).toHaveBeenCalledWith({ id: 'user-1' });
    expect(mockScope.setExtras).toHaveBeenCalledWith({ key: 'value' });
    expect(mockScope.setFingerprint).toHaveBeenCalledWith([
      'render',
      'App',
      'mount',
    ]);
    expect(Sentry.captureException).toHaveBeenCalledWith(error);
  });

  it('captures a non-Error as a message', () => {
    captureError('string error', { category: 'unknown' });

    expect(Sentry.captureMessage).toHaveBeenCalledWith('string error', 'error');
  });

  it('defaults severity to error', () => {
    captureError(new Error('test'), { category: 'api' });

    expect(mockScope.setLevel).toHaveBeenCalledWith('error');
  });

  it('does not set optional tags when not provided', () => {
    captureError(new Error('test'), { category: 'config' });

    const tagCalls = mockScope.setTag.mock.calls.map((c: unknown[]) => c[0]);
    expect(tagCalls).toContain('error.category');
    expect(tagCalls).not.toContain('component');
    expect(tagCalls).not.toContain('action');
  });
});

describe('captureRenderError', () => {
  it('captures render error with component stack', () => {
    const error = new Error('render failed');
    const errorInfo = { componentStack: '<App>\n  <Child>', digest: undefined };

    captureRenderError(error, errorInfo as React.ErrorInfo, 'PageBoundary');

    expect(mockScope.setTag).toHaveBeenCalledWith('error.category', 'render');
    expect(mockScope.setTag).toHaveBeenCalledWith('component', 'PageBoundary');
    expect(mockScope.setContext).toHaveBeenCalledWith('react', {
      componentStack: '<App>\n  <Child>',
    });
    expect(mockScope.setFingerprint).toHaveBeenCalledWith([
      'render',
      'PageBoundary',
      'render failed',
    ]);
    expect(Sentry.captureException).toHaveBeenCalledWith(error);
  });

  it('defaults componentName to ErrorBoundary', () => {
    captureRenderError(new Error('err'), {
      componentStack: '',
      digest: undefined,
    } as React.ErrorInfo);

    expect(mockScope.setTag).toHaveBeenCalledWith('component', 'ErrorBoundary');
  });
});

describe('captureApiError', () => {
  it('captures 4xx auth errors as warnings', () => {
    const error = new Error('forbidden');
    captureApiError(error, '/api/admin', 'GET', 403);

    expect(mockScope.setLevel).toHaveBeenCalledWith('warning');
    expect(mockScope.setTag).toHaveBeenCalledWith('error.category', 'auth');
    expect(mockScope.setTag).toHaveBeenCalledWith('api.route', '/api/admin');
    expect(mockScope.setTag).toHaveBeenCalledWith('api.method', 'GET');
    expect(mockScope.setTag).toHaveBeenCalledWith('http.status_code', '403');
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      'Client error: forbidden',
      'warning'
    );
  });

  it('captures 4xx validation errors as info', () => {
    const error = new Error('invalid input');
    captureApiError(error, '/api/email', 'POST', 400);

    expect(mockScope.setLevel).toHaveBeenCalledWith('info');
    expect(mockScope.setTag).toHaveBeenCalledWith(
      'error.category',
      'validation'
    );
  });

  it('captures 5xx errors using captureError', () => {
    const error = new Error('server crash');
    captureApiError(error, '/api/email', 'POST', 500, { extra: 'data' });

    expect(Sentry.captureException).toHaveBeenCalledWith(error);
    expect(mockScope.setTag).toHaveBeenCalledWith('error.category', 'api');
    expect(mockScope.setLevel).toHaveBeenCalledWith('error');
  });

  it('passes metadata for 4xx errors', () => {
    captureApiError(new Error('bad request'), '/api/email', 'POST', 400, {
      field: 'email',
    });

    expect(mockScope.setExtras).toHaveBeenCalledWith({ field: 'email' });
  });
});

describe('captureFormError', () => {
  it('captures form errors with field details', () => {
    const error = new Error('validation failed');
    captureFormError('contact', error, { name: 'Required' });

    expect(Sentry.captureException).toHaveBeenCalledWith(error);
    expect(mockScope.setTag).toHaveBeenCalledWith('error.category', 'form');
    expect(mockScope.setLevel).toHaveBeenCalledWith('warning');
  });
});

describe('captureNetworkError', () => {
  it('captures network errors with URL and method', () => {
    const error = new Error('fetch failed');
    captureNetworkError('https://api.example.com/data', error, 'POST');

    expect(Sentry.captureException).toHaveBeenCalledWith(error);
    expect(mockScope.setTag).toHaveBeenCalledWith('error.category', 'network');
  });

  it('defaults method to GET', () => {
    captureNetworkError('https://api.example.com', new Error('timeout'));

    expect(mockScope.setExtras).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'GET' })
    );
  });
});

describe('setUserContext', () => {
  it('sets user with id only', () => {
    setUserContext('user-123');
    expect(Sentry.setUser).toHaveBeenCalledWith({ id: 'user-123' });
  });

  it('sets user with email', () => {
    setUserContext('user-123', 'test@example.com');
    expect(Sentry.setUser).toHaveBeenCalledWith({
      id: 'user-123',
      email: 'test@example.com',
    });
  });

  it('sets user with additional data', () => {
    setUserContext('user-123', undefined, { role: 'admin' });
    expect(Sentry.setUser).toHaveBeenCalledWith({
      id: 'user-123',
      role: 'admin',
    });
  });
});

describe('clearUserContext', () => {
  it('clears user context', () => {
    clearUserContext();
    expect(Sentry.setUser).toHaveBeenCalledWith(null);
  });
});

describe('addBreadcrumb', () => {
  it('adds breadcrumb with message and default category', () => {
    addBreadcrumb('clicked button');
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
      message: 'clicked button',
      category: 'user',
      level: 'info',
    });
  });

  it('adds breadcrumb with custom category and data', () => {
    addBreadcrumb('fetched data', 'http', { url: '/api/data' });
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
      message: 'fetched data',
      category: 'http',
      level: 'info',
      data: { url: '/api/data' },
    });
  });
});

describe('withSpan', () => {
  it('executes callback within a Sentry span', async () => {
    const result = await withSpan('db-query', 'db', async () => 'result');
    expect(result).toBe('result');
    expect(Sentry.startSpan).toHaveBeenCalledWith(
      { name: 'db-query', op: 'db' },
      expect.any(Function)
    );
  });
});
