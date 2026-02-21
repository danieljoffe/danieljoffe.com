import type { Request, Response, NextFunction } from 'express';

describe('authMiddleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let statusFn: jest.Mock;
  let jsonFn: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    jsonFn = jest.fn();
    statusFn = jest.fn(() => ({ json: jsonFn }));
    mockReq = { headers: {} };
    mockRes = {
      status: statusFn,
      json: jsonFn,
    } as unknown as Partial<Response>;
    mockNext = jest.fn();
  });

  it('returns 500 when SCAN_SERVICE_API_KEY is not set', async () => {
    delete process.env['SCAN_SERVICE_API_KEY'];
    const { authMiddleware } = await import('./auth.js');

    authMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(statusFn).toHaveBeenCalledWith(500);
    expect(jsonFn).toHaveBeenCalledWith({
      error: 'Server misconfigured: missing API key',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('returns 401 when x-api-key header is missing', async () => {
    process.env['SCAN_SERVICE_API_KEY'] = 'test-secret';
    const { authMiddleware } = await import('./auth.js');

    authMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(statusFn).toHaveBeenCalledWith(401);
    expect(jsonFn).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('returns 401 when x-api-key does not match', async () => {
    process.env['SCAN_SERVICE_API_KEY'] = 'test-secret';
    const { authMiddleware } = await import('./auth.js');

    mockReq.headers = { 'x-api-key': 'wrong-key' };
    authMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(statusFn).toHaveBeenCalledWith(401);
    expect(jsonFn).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('calls next() when x-api-key matches', async () => {
    process.env['SCAN_SERVICE_API_KEY'] = 'test-secret';
    const { authMiddleware } = await import('./auth.js');

    mockReq.headers = { 'x-api-key': 'test-secret' };
    authMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(statusFn).not.toHaveBeenCalled();
  });
});
