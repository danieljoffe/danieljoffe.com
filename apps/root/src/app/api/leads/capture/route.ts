import { NextResponse } from 'next/server';
import { checkBotId } from 'botid/server';
import { isValidUuid, GRADE_MAP } from '@danieljoffe.com/shared-audit';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createResendClient, EMAIL_FROM } from '@/lib/email/resend';
import { buildUnsubscribeUrl } from '@/lib/email/tokens';
import { captureApiError } from '@/lib/errorTracking';
import FullReportEmail from '@/components/emails/FullReport';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    if (process.env['VERCEL']) {
      const botCheck = await checkBotId();
      if (botCheck.isBot) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    const body = await request.json();
    const { email, name, company, scan_id, source } = body as {
      email?: string;
      name?: string;
      company?: string;
      scan_id?: string;
      source?: string;
    };

    if (!email || typeof email !== 'string' || !EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    if (scan_id && !isValidUuid(scan_id)) {
      return NextResponse.json({ error: 'Invalid scan ID' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      );
    }

    // Look up scan data if scan_id provided
    let urlScanned: string | null = null;
    let scanData: {
      url: string;
      grade_overall: string | null;
      score_performance: number | null;
      score_accessibility: number | null;
      score_seo: number | null;
      score_best_practices: number | null;
    } | null = null;
    let topIssues: Array<{
      title: string;
      severity: string;
      category: string;
    }> = [];

    if (scan_id) {
      const { data: scan } = await supabase
        .from('scans')
        .select(
          'url, grade_overall, score_performance, score_accessibility, score_seo, score_best_practices'
        )
        .eq('id', scan_id)
        .single();

      if (scan) {
        urlScanned = scan.url;
        scanData = scan;
      }

      const { data: issues } = await supabase
        .from('scan_issues')
        .select('title, severity, category')
        .eq('scan_id', scan_id)
        .order('sort_order', { ascending: true })
        .limit(3);

      if (issues) {
        topIssues = issues;
      }
    }

    // Check for existing lead with same email + scan_id
    if (scan_id) {
      const { data: existingLead } = await supabase
        .from('leads')
        .select('id')
        .eq('email', email)
        .eq('scan_id', scan_id)
        .single();

      if (existingLead) {
        return NextResponse.json({
          status: 'already_captured',
          lead_id: existingLead.id,
        });
      }
    }

    // Insert lead
    const { data: newLead, error: insertError } = await supabase
      .from('leads')
      .insert({
        email,
        name: name || null,
        company: company || null,
        scan_id: scan_id || null,
        url_scanned: urlScanned,
        source: source || 'full_report',
        email_sequence_step: 1,
        last_email_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertError || !newLead) {
      throw new Error(insertError?.message || 'Failed to create lead');
    }

    // Send report email (non-blocking — lead capture succeeds even if email fails)
    const siteUrl =
      process.env['NEXT_PUBLIC_SITE_URL'] || 'https://danieljoffe.com';
    let resendId: string | null = null;

    try {
      const resend = createResendClient();
      if (!resend) {
        throw new Error('Missing RESEND_API_KEY environment variable');
      }

      const reportUrl = scan_id ? `${siteUrl}/audit/r/${scan_id}` : siteUrl;
      const unsubscribeUrl = buildUnsubscribeUrl(newLead.id, siteUrl);
      const gradeInfo = scanData?.grade_overall
        ? GRADE_MAP[scanData.grade_overall]
        : null;

      const emailResult = await resend.emails.send({
        from: EMAIL_FROM,
        to: email,
        subject: scanData?.grade_overall
          ? `Your Website Audit: Grade ${scanData.grade_overall} — ${scanData.url}`
          : 'Your Website Audit Report',
        react: FullReportEmail({
          name: name || null,
          url: scanData?.url || urlScanned || '',
          grade: scanData?.grade_overall || '?',
          gradeLabel: gradeInfo?.label || '',
          gradeColor: gradeInfo?.color || '#888',
          scores: {
            performance: scanData?.score_performance ?? null,
            accessibility: scanData?.score_accessibility ?? null,
            seo: scanData?.score_seo ?? null,
            bestPractices: scanData?.score_best_practices ?? null,
          },
          topIssues,
          reportUrl,
          unsubscribeUrl,
        }),
      });

      resendId = emailResult.data?.id || null;
    } catch (emailError) {
      captureApiError(
        emailError instanceof Error
          ? emailError
          : new Error('Email send failed'),
        '/api/leads/capture',
        'POST',
        500,
        { leadId: newLead.id }
      );
    }

    // Log email attempt
    if (resendId) {
      await supabase.from('email_log').insert({
        lead_id: newLead.id,
        template: 'full_report',
        sent_at: new Date().toISOString(),
        resend_id: resendId,
      });
    }

    return NextResponse.json({
      status: 'captured',
      lead_id: newLead.id,
    });
  } catch (error) {
    captureApiError(error, '/api/leads/capture', 'POST', 500);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
