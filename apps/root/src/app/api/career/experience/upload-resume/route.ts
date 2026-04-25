import { type NextRequest, NextResponse } from 'next/server';
import {
  verifyJobsAccess,
  proxyMultipartToFastAPI,
} from '@/app/api/jobs/proxy';

export async function POST(request: NextRequest) {
  if (!(await verifyJobsAccess())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return proxyMultipartToFastAPI('/experience/upload-resume', request, {
    searchParams: request.nextUrl.searchParams,
  });
}
