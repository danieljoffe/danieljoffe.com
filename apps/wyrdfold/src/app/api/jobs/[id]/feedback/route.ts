import type { NextRequest } from 'next/server';

import { proxyToWyrdfoldAPI } from '@/lib/api/proxy';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  return proxyToWyrdfoldAPI(`/jobs/${id}/feedback`, {
    method: 'POST',
    body,
  });
}

export async function DELETE(request: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  return proxyToWyrdfoldAPI(`/jobs/${id}/feedback`, {
    method: 'DELETE',
    searchParams: request.nextUrl.searchParams,
  });
}
