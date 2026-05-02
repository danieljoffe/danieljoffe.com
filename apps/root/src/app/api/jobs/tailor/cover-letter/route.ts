import { type NextRequest, NextResponse } from 'next/server';
import {
  getJobsAccess,
  proxyToFastAPI,
  LLM_TIMEOUT_MS,
} from '@/app/api/jobs/proxy';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkTailorRateLimit, tooManyRequests } from '@/lib/llmRateLimit';

/** Naive HTML tag stripper — enough for JD text extraction. */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function POST(request: NextRequest) {
  const access = await getJobsAccess();
  if (!access) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (access.kind === 'user') {
    const blocked = tooManyRequests(checkTailorRateLimit(access.userId));
    if (blocked) return blocked;
  }

  const body = (await request.json()) as Record<string, unknown>;

  // If job_description is missing or empty, fetch from jobs table
  if (!body['job_description'] && body['job_posting_id']) {
    const supabase = createServerSupabaseClient();
    if (supabase) {
      const { data } = await supabase
        .from('jobs')
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
