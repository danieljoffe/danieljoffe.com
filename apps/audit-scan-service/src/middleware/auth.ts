import type { Request, Response, NextFunction } from 'express';

const expectedKey = process.env['SCAN_SERVICE_API_KEY'];
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const apiKey = req.headers['x-api-key'];

  if (!expectedKey) {
    res.status(500).json({ error: 'Server misconfigured: missing API key' });
    return;
  }

  if (apiKey !== expectedKey) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}
