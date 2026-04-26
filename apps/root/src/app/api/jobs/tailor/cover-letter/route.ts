import { type NextRequest, NextResponse } from 'next/server';
import {
  verifyJobsAccess,
  proxyToFastAPI,
  LLM_TIMEOUT_MS,
} from '@/app/api/jobs/proxy';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/** Naive HTML tag stripper — enough for JD text extraction. */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function POST(request: NextRequest) {
  if (!(await verifyJobsAccess())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;

  // If job_description is missing or empty, fetch from job_postings table
  if (!body['job_description'] && body['job_posting_id']) {
    const supabase = createServerSupabaseClient();
    if (supabase) {
      const { data } = await supabase
        .from('job_postings')
        .select('description_html')
        .eq('id', body['job_posting_id'] as string)
        .single();

      if (data?.description_html) {
        body['job_description'] = stripHtml(data.description_html as string);
      }
    }
  }

  return proxyToFastAPI('/tailor/cover-letter', {
    method: 'POST',
    body,
    timeoutMs: LLM_TIMEOUT_MS,
  });
}
