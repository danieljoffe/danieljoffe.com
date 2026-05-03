import type { NextRequest } from 'next/server';

import { proxyToWyrdfoldAPI } from '@/lib/api/proxy';

import { validatePeriod } from '../validatePeriod';

export async function GET(request: NextRequest) {
  const invalid = validatePeriod(request);
  if (invalid) return invalid;
  return proxyToWyrdfoldAPI('/insights/pipeline', {
    searchParams: request.nextUrl.searchParams,
  });
}
