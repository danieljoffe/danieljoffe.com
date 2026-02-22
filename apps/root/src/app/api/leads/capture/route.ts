import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { captureApiError } from '@/lib/errorTracking';
import { isValidUuid } from '@danieljoffe.com/shared-audit';
import { Resend } from 'resend';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
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

    // Look up scan URL if scan_id provided
    let urlScanned: string | null = null;
    if (scan_id) {
      const { data: scan } = await supabase
        .from('scans')
        .select('url')
        .eq('id', scan_id)
        .single();

      if (scan) {
        urlScanned = scan.url;
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
    // Env vars read per-request for testability and key rotation without restart
    const siteUrl =
      process.env['NEXT_PUBLIC_SITE_URL'] || 'https://danieljoffe.com';
    const resendApiKey = process.env['RESEND_API_KEY'];
    let resendId: string | null = null;

    try {
      const reportUrl = scan_id ? `${siteUrl}/audit/r/${scan_id}` : siteUrl;

      if (!resendApiKey) {
        throw new Error('Missing RESEND_API_KEY environment variable');
      }
      const resend = new Resend(resendApiKey);

      const emailResult = await resend.emails.send({
        from: 'Daniel Joffe <noreply@danieljoffe.com>',
        to: email,
        subject: 'Your Website Audit Report',
        html: `
          <h1>Your Website Audit Report</h1>
          <p>Hi${name ? ` ${name}` : ''},</p>
          <p>Thank you for using our website audit tool. Your report is ready:</p>
          <p><a href="${reportUrl}">View your full report</a></p>
          <p>Best regards,<br/>Daniel Joffe</p>
        `,
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
        template: 'report_delivery',
        sent_at: new Date().toISOString(),
        resend_id: resendId,
      });
    }

    return NextResponse.json({
      status: 'captured',
      lead_id: newLead.id,
    });
  } catch (error) {
    captureApiError(
      error instanceof Error ? error : new Error('Unknown error'),
      '/api/leads/capture',
      'POST',
      500
    );

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
