import type { NextRequest } from 'next/server';

import { proxyToWyrdfoldAPI, readJsonBody } from '@/lib/api/proxy';

export async function POST(request: NextRequest) {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  return proxyToWyrdfoldAPI('/tailor/resumes/export-zip', {
    method: 'POST',
    body: parsed.body,
    binary: true,
  });
}
