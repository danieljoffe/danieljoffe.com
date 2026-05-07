import type { NextRequest } from 'next/server';

import { proxyToWyrdfoldAPI } from '@/lib/api/proxy';

import { validatePeriod } from '../validatePeriod';

export async function GET(request: NextRequest) {
  const invalid = validatePeriod(request);
  if (invalid) return invalid;
  return proxyToWyrdfoldAPI('/insights/targets', {
    searchParams: request.nextUrl.searchParams,
  });
}
