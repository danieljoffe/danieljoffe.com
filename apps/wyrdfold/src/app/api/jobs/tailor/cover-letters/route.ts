import type { NextRequest } from 'next/server';

import { proxyToWyrdfoldAPI } from '@/lib/api/proxy';

export async function GET(request: NextRequest) {
  return proxyToWyrdfoldAPI('/tailor/cover-letters', {
    searchParams: request.nextUrl.searchParams,
  });
}
