import type { NextRequest } from 'next/server';

import { proxyToWyrdfoldAPI } from '@/lib/api/proxy';

export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyToWyrdfoldAPI('/tailor/resumes/export-zip', {
    method: 'POST',
    body,
    binary: true,
  });
}
