import { NextResponse } from 'next/server';
import {
  proxyStreamingToFastAPI,
  verifyJobsAccess,
} from '@/app/api/jobs/proxy';

export async function POST(request: Request) {
  if (!(await verifyJobsAccess())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return proxyStreamingToFastAPI('/experience/derive/stream', request, {
    method: 'POST',
  });
}
