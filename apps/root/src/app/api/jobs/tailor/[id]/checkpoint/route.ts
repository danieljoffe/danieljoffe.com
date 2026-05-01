import { NextResponse } from 'next/server';
import { verifyJobsAccess, proxyToFastAPI } from '@/app/api/jobs/proxy';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifyJobsAccess())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  // Body may be empty (explicit checkpoint with no flush) or contain
  // {markdown} for the sendBeacon flush case. Tolerate both.
  let body: unknown = null;
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {
    // Fall through with body null.
  }

  return proxyToFastAPI(`/tailor/resumes/${id}/checkpoint`, {
    method: 'POST',
    ...(body ? { body } : {}),
  });
}
