import { NextRequest, NextResponse } from 'next/server';
import { checkBotId } from 'botid/server';
import {
  isValidUrl,
  normalizeUrl,
  hashIp,
} from '@danieljoffe.com/shared-audit';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { captureApiError } from '@/lib/errorTracking';

const RATE_LIMIT_MAX = process.env.NODE_ENV === 'development' ? 999 : 10;
const RATE_LIMIT_WINDOW_HOURS = 1;
const CACHE_WINDOW_HOURS = 1;

type DeviceSelection = 'mobile' | 'desktop' | 'both';

function parseDevice(raw: unknown): DeviceSelection {
  if (raw === 'desktop') return 'desktop';
  if (raw === 'both') return 'both';
  return 'mobile';
}

async function markScanFailed(
  supabase: any,
  scanId: string,
  errorMessage: string
) {
  await supabase
    .from('scans')
    .update({ status: 'failed', error_message: errorMessage })
    .eq('id', scanId);
}

function fireScan(
  serviceUrl: string,
  apiKey: string,
  payload: { scan_id: string; url: string; device_mode: string },
  supabase: any
) {
  fetch(`${serviceUrl}/run-scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(payload),
  })
    .then(async res => {
      if (res.ok) return;
      const message = `Scan service returned HTTP ${res.status}`;
      await markScanFailed(supabase, payload.scan_id, message);
      captureApiError(
        new Error(message),
        '/api/audit/scan',
        'POST',
        res.status,
        { scanId: payload.scan_id }
      );
    })
    .catch(async (fetchError: unknown) => {
      await markScanFailed(
        supabase,
        payload.scan_id,
        'Failed to reach scan service'
      );

      captureApiError(
        fetchError instanceof Error
          ? fetchError
          : new Error('Scan service fetch failed'),
        '/api/audit/scan',
        'POST',
        500,
        { scanId: payload.scan_id }
      );
    });
}

export async function POST(request: NextRequest) {
  try {
    if (process.env['VERCEL']) {
      const botCheck = await checkBotId();
      if (botCheck.isBot) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    const body = await request.json();
    const {
      url,
      source,
      device: rawDevice,
    } = body as {
      url?: string;
      source?: string;
      device?: string;
    };
    const device = parseDevice(rawDevice);

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
    if (!supabase) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      );
    }

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

    // "both" counts as 2 scans against the limit
    const scanCount = device === 'both' ? 2 : 1;
    if (recentScans !== null && recentScans + scanCount > RATE_LIMIT_MAX) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Normalize and check for cached result
    const normalized = normalizeUrl(url);

    // For single-device scans, check cache with device_mode filter
    if (device !== 'both') {
      const { data: cachedScan } = await supabase
        .from('scans')
        .select('id, status')
        .eq('normalized_url', normalized)
        .eq('device_mode', device)
        .eq('status', 'completed')
        .gte(
          'completed_at',
          new Date(
            Date.now() - CACHE_WINDOW_HOURS * 60 * 60 * 1000
          ).toISOString()
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
    }

    const scanServiceUrl = process.env['SCAN_SERVICE_URL'];
    const scanServiceApiKey = process.env['SCAN_SERVICE_API_KEY'];
    if (!scanServiceUrl || !scanServiceApiKey) {
      captureApiError(
        new Error('SCAN_SERVICE_URL or SCAN_SERVICE_API_KEY is not set'),
        '/api/audit/scan',
        'POST',
        503
      );
      return NextResponse.json(
        { error: 'Scan service is not configured. Please try again later.' },
        { status: 503 }
      );
    }
    const sourceValue = source || 'organic';

    // --- "both" mode: create two scans, link them ---
    if (device === 'both') {
      const { data: mobileScan, error: mobileErr } = await supabase
        .from('scans')
        .insert({
          url,
          normalized_url: normalized,
          status: 'pending',
          source: sourceValue,
          ip_hash: ipHash,
          device_mode: 'mobile',
        })
        .select('id')
        .single();

      if (mobileErr || !mobileScan) {
        throw new Error(mobileErr?.message || 'Failed to create mobile scan');
      }

      const { data: desktopScan, error: desktopErr } = await supabase
        .from('scans')
        .insert({
          url,
          normalized_url: normalized,
          status: 'pending',
          source: sourceValue,
          ip_hash: ipHash,
          device_mode: 'desktop',
        })
        .select('id')
        .single();

      if (desktopErr || !desktopScan) {
        throw new Error(desktopErr?.message || 'Failed to create desktop scan');
      }

      // Link the two scans to each other
      await supabase
        .from('scans')
        .update({ paired_scan_id: desktopScan.id })
        .eq('id', mobileScan.id);
      await supabase
        .from('scans')
        .update({ paired_scan_id: mobileScan.id })
        .eq('id', desktopScan.id);

      fireScan(
        scanServiceUrl,
        scanServiceApiKey,
        { scan_id: mobileScan.id, url: normalized, device_mode: 'mobile' },
        supabase
      );
      fireScan(
        scanServiceUrl,
        scanServiceApiKey,
        {
          scan_id: desktopScan.id,
          url: normalized,
          device_mode: 'desktop',
        },
        supabase
      );

      return NextResponse.json({
        scan_id: mobileScan.id,
        desktop_scan_id: desktopScan.id,
        status: 'pending',
        device: 'both',
      });
    }

    // --- Single device mode ---
    const { data: newScan, error: insertError } = await supabase
      .from('scans')
      .insert({
        url,
        normalized_url: normalized,
        status: 'pending',
        source: sourceValue,
        ip_hash: ipHash,
        device_mode: device,
      })
      .select('id')
      .single();

    if (insertError || !newScan) {
      throw new Error(insertError?.message || 'Failed to create scan');
    }

    fireScan(
      scanServiceUrl,
      scanServiceApiKey,
      { scan_id: newScan.id, url: normalized, device_mode: device },
      supabase
    );

    return NextResponse.json({
      scan_id: newScan.id,
      status: 'pending',
    });
  } catch (error) {
    captureApiError(error, '/api/audit/scan', 'POST', 500);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
