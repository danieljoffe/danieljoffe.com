import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { captureApiError } from '@/lib/errorTracking';
import {
  isValidUrl,
  normalizeUrl,
  hashIp,
} from '@danieljoffe.com/shared-audit';

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_HOURS = 1;
const CACHE_WINDOW_HOURS = 1;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, source } = body as { url?: string; source?: string };

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    if (!isValidUrl(url)) {
      return NextResponse.json(
        { error: 'Invalid or disallowed URL' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Rate limiting by IP hash
    // x-forwarded-for is always set on Vercel. The 'unknown' fallback only
    // applies in local dev; all such requests share a single rate-limit bucket.
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
    const ipHash = hashIp(ip);

    const oneHourAgo = new Date(
      Date.now() - RATE_LIMIT_WINDOW_HOURS * 60 * 60 * 1000
    ).toISOString();

    const { count: recentScans } = await supabase
      .from('scans')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('created_at', oneHourAgo);

    if (recentScans !== null && recentScans >= RATE_LIMIT_MAX) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Normalize and check for cached result
    const normalized = normalizeUrl(url);

    const { data: cachedScan } = await supabase
      .from('scans')
      .select('id, status')
      .eq('normalized_url', normalized)
      .eq('status', 'completed')
      .gte(
        'completed_at',
        new Date(Date.now() - CACHE_WINDOW_HOURS * 60 * 60 * 1000).toISOString()
      )
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cachedScan) {
      return NextResponse.json({
        scan_id: cachedScan.id,
        status: 'completed',
        cached: true,
      });
    }

    // Create new scan
    const { data: newScan, error: insertError } = await supabase
      .from('scans')
      .insert({
        url,
        normalized_url: normalized,
        status: 'pending',
        source: source || 'organic',
        ip_hash: ipHash,
      })
      .select('id')
      .single();

    if (insertError || !newScan) {
      throw new Error(insertError?.message || 'Failed to create scan');
    }

    // Fire-and-forget scan trigger
    const scanServiceUrl = process.env['SCAN_SERVICE_URL'];
    const scanServiceApiKey = process.env['SCAN_SERVICE_API_KEY'];

    if (scanServiceUrl && scanServiceApiKey) {
      fetch(`${scanServiceUrl}/run-scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': scanServiceApiKey,
        },
        body: JSON.stringify({ scan_id: newScan.id, url: normalized }),
      }).catch(async fetchError => {
        await supabase
          .from('scans')
          .update({
            status: 'failed',
            error_message: 'Failed to reach scan service',
          })
          .eq('id', newScan.id);

        captureApiError(
          fetchError instanceof Error
            ? fetchError
            : new Error('Scan service fetch failed'),
          '/api/audit/scan',
          'POST',
          500,
          { scanId: newScan.id }
        );
      });
    }

    return NextResponse.json({
      scan_id: newScan.id,
      status: 'pending',
    });
  } catch (error) {
    captureApiError(
      error instanceof Error ? error : new Error('Unknown error'),
      '/api/audit/scan',
      'POST',
      500
    );

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
