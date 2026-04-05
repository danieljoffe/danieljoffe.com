import { NextRequest, NextResponse } from 'next/server';
import type { ReactElement } from 'react';
import { GRADE_MAP } from '@danieljoffe.com/shared-audit';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createResendClient, EMAIL_FROM } from '@/lib/email/resend';
import { buildUnsubscribeUrl } from '@/lib/email/tokens';
import { captureApiError } from '@/lib/errorTracking';
import { CALENDLY_URL } from '@/utils/constants';
import QuickWinEmail from '@/components/emails/QuickWin';
import FollowUpEmail from '@/components/emails/FollowUp';

const BATCH_LIMIT = 20;

/** Days to wait after last_email_at before sending next step. */
const STEP_DELAY_DAYS: Record<number, number> = {
  1: 3, // step 1 → 2: 3 days after capture
  2: 7, // step 2 → 3: 7 days after quick-win (10 total)
};

interface SequenceResults {
  sent: number;
  skipped: number;
  errors: number;
}

interface SequenceServices {
  supabase: ReturnType<typeof createServerSupabaseClient> & object;
  resend: NonNullable<ReturnType<typeof createResendClient>>;
  siteUrl: string;
}

type LeadOutcome =
  | { status: 'sent' }
  | { status: 'skipped' }
  | { status: 'error' };

interface LeadRow {
  id: string;
  email: string;
  name: string | null;
  scan_id: string | null;
  url_scanned: string | null;
}

interface IssueRow {
  title: string;
  description: string;
  category: string;
  severity: string;
  fix_difficulty: string;
  impact: string | null;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env['CRON_SECRET'];

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerSupabaseClient();
  const resend = createResendClient();

  if (!supabase || !resend) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  const siteUrl =
    process.env['NEXT_PUBLIC_SITE_URL'] || 'https://danieljoffe.com';
  const services: SequenceServices = { supabase, resend, siteUrl };

  const step1 = await processStep(1, services);
  const step2 = await processStep(2, services);

  return NextResponse.json({
    ok: true,
    sent: step1.sent + step2.sent,
    skipped: step1.skipped + step2.skipped,
    errors: step1.errors + step2.errors,
    processedAt: new Date().toISOString(),
  });
}

async function processStep(
  step: number,
  services: SequenceServices
): Promise<SequenceResults> {
  const results: SequenceResults = { sent: 0, skipped: 0, errors: 0 };
  const delayDays = STEP_DELAY_DAYS[step];
  if (!delayDays) return results;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - delayDays);

  const { data: leads } = await services.supabase
    .from('leads')
    .select('id, email, name, scan_id, url_scanned')
    .eq('unsubscribed', false)
    .eq('email_sequence_step', step)
    .lt('last_email_at', cutoff.toISOString())
    .limit(BATCH_LIMIT);

  if (!leads || leads.length === 0) return results;

  for (const lead of leads) {
    const outcome = await processLead(lead as LeadRow, step, services);
    if (outcome.status === 'sent') results.sent++;
    else if (outcome.status === 'skipped') results.skipped++;
    else results.errors++;
  }

  return results;
}

async function processLead(
  lead: LeadRow,
  step: number,
  services: SequenceServices
): Promise<LeadOutcome> {
  try {
    if (!lead.scan_id) {
      await advanceLead(services.supabase, lead.id, step);
      return { status: 'skipped' };
    }

    const emailElement = await buildEmail(
      step,
      { ...lead, scan_id: lead.scan_id },
      services
    );

    if (!emailElement) {
      await advanceLead(services.supabase, lead.id, step);
      return { status: 'skipped' };
    }

    const templateName = step === 1 ? 'quick_win' : 'follow_up';
    const subject =
      step === 1
        ? `Quick fix for ${lead.url_scanned || 'your site'}`
        : `Your website still needs attention — let's fix it`;

    const { data: emailResult } = await services.resend.emails.send({
      from: EMAIL_FROM,
      to: lead.email,
      subject,
      react: emailElement,
    });

    await advanceLead(services.supabase, lead.id, step);

    await services.supabase.from('email_log').insert({
      lead_id: lead.id,
      template: templateName,
      sent_at: new Date().toISOString(),
      resend_id: emailResult?.id || null,
    });

    return { status: 'sent' };
  } catch (error) {
    captureApiError(error, '/api/email/sequence', 'GET', 500, {
      leadId: lead.id,
      step,
    });
    return { status: 'error' };
  }
}

async function advanceLead(
  supabase: ReturnType<typeof createServerSupabaseClient> & object,
  leadId: string,
  currentStep: number
) {
  await supabase
    .from('leads')
    .update({
      email_sequence_step: currentStep + 1,
      last_email_at: new Date().toISOString(),
    })
    .eq('id', leadId);
}

async function buildEmail(
  step: number,
  lead: {
    id: string;
    email: string;
    name: string | null;
    scan_id: string;
    url_scanned: string | null;
  },
  services: SequenceServices
): Promise<ReactElement | null> {
  const unsubscribeUrl = buildUnsubscribeUrl(lead.id, services.siteUrl);
  const reportUrl = `${services.siteUrl}/audit/r/${lead.scan_id}`;

  const { data: scan } = await services.supabase
    .from('scans')
    .select(
      'url, grade_overall, score_performance, score_accessibility, score_seo, score_best_practices'
    )
    .eq('id', lead.scan_id)
    .eq('status', 'completed')
    .single();

  if (!scan) return null;

  const gradeInfo = scan.grade_overall
    ? GRADE_MAP[scan.grade_overall as string]
    : null;

  if (step === 1) {
    const { data: issues } = await services.supabase
      .from('scan_issues')
      .select('title, description, category, severity, fix_difficulty, impact')
      .eq('scan_id', lead.scan_id)
      .order('sort_order', { ascending: true });

    const issue = selectQuickWin(issues || []);
    if (!issue) return null;

    return QuickWinEmail({
      name: lead.name,
      url: scan.url,
      issue,
      reportUrl,
      unsubscribeUrl,
    });
  }

  if (step === 2) {
    return FollowUpEmail({
      name: lead.name,
      url: scan.url,
      grade: scan.grade_overall || '?',
      gradeLabel: gradeInfo?.label || '',
      gradeColor: gradeInfo?.color || '#888',
      reportUrl,
      calendlyUrl: CALENDLY_URL,
      unsubscribeUrl,
    });
  }

  return null;
}

function selectQuickWin(issues: IssueRow[]): IssueRow | null {
  return (
    issues.find(i => i.fix_difficulty === 'easy') ||
    issues.find(i => i.fix_difficulty === 'moderate') ||
    null
  );
}
