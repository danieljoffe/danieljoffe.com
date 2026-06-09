import type { NextRequest } from 'next/server';

import { proxyToWyrdfoldAPI, readJsonBody } from '@/lib/api/proxy';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  return proxyToWyrdfoldAPI(`/jobs/${id}/feedback`, {
    method: 'POST',
    body: parsed.body,
  });
}

export async function DELETE(request: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  return proxyToWyrdfoldAPI(`/jobs/${id}/feedback`, {
    method: 'DELETE',
    searchParams: request.nextUrl.searchParams,
  });
}
