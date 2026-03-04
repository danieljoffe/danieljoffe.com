// Inline type to avoid cross-boundary dependency (e2e cannot import shared-audit)
interface ScanIssue {
  id: string;
  scan_id: string;
  category: 'performance' | 'accessibility' | 'seo' | 'ux';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  impact: string | null;
  fix_difficulty: 'easy' | 'moderate' | 'complex' | null;
  technical_detail: Record<string, unknown> | null;
  sort_order: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MOCK_SCAN_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
export const INVALID_UUID = 'not-a-uuid';
export const NONEXISTENT_UUID = '00000000-0000-0000-0000-000000000000';

export const VALID_TEST_URL = 'example.com';
export const INVALID_URLS = ['no-tld', 'localhost', '192.168.1.1', '10.0.0.1'];

// ---------------------------------------------------------------------------
// Scan API factories (POST /api/audit/scan)
// ---------------------------------------------------------------------------

export function makeScanCreatedResponse(scanId = MOCK_SCAN_ID) {
  return { scan_id: scanId, status: 'pending' as const };
}

export function makeScanCachedResponse(scanId = MOCK_SCAN_ID) {
  return { scan_id: scanId, status: 'completed' as const, cached: true };
}

// ---------------------------------------------------------------------------
// Status API factories (GET /api/audit/status/[id])
// ---------------------------------------------------------------------------

export function makeStatusPending(scanId = MOCK_SCAN_ID) {
  return {
    id: scanId,
    status: 'pending' as const,
    error_message: null,
    grade: null,
  };
}

export function makeStatusRunning(scanId = MOCK_SCAN_ID) {
  return {
    id: scanId,
    status: 'running' as const,
    error_message: null,
    grade: null,
  };
}

export function makeStatusCompleted(scanId = MOCK_SCAN_ID, grade = 'B') {
  return {
    id: scanId,
    status: 'completed' as const,
    error_message: null,
    grade,
  };
}

export function makeStatusFailed(
  scanId = MOCK_SCAN_ID,
  errorMsg = 'Scan timed out'
) {
  return {
    id: scanId,
    status: 'failed' as const,
    error_message: errorMsg,
    grade: null,
  };
}

// ---------------------------------------------------------------------------
// Issue factory
// ---------------------------------------------------------------------------

let issueCounter = 0;

export function makeIssue(overrides: Partial<ScanIssue> = {}): ScanIssue {
  const id = `issue-${++issueCounter}`;
  return {
    id,
    scan_id: MOCK_SCAN_ID,
    category: 'performance',
    severity: 'warning',
    title: `Test issue ${id}`,
    description: 'Test description for this issue.',
    impact: 'This affects page load time.',
    fix_difficulty: 'easy',
    technical_detail: null,
    sort_order: issueCounter,
    ...overrides,
  };
}

/** 5 issues (2 critical, 2 warning, 1 info) — triggers email gate (>3) */
export const ISSUES_AVERAGE: ScanIssue[] = [
  makeIssue({
    severity: 'critical',
    category: 'performance',
    title: 'Slow LCP',
  }),
  makeIssue({
    severity: 'critical',
    category: 'accessibility',
    title: 'Low contrast text',
  }),
  makeIssue({
    severity: 'warning',
    category: 'seo',
    title: 'Missing meta description',
  }),
  makeIssue({
    severity: 'warning',
    category: 'performance',
    title: 'Unminified CSS',
  }),
  makeIssue({ severity: 'info', category: 'ux', title: 'No favicon' }),
];

/** 2 issues — no email gate (<=3 free) */
export const ISSUES_UNDER_GATE: ScanIssue[] = [
  makeIssue({
    severity: 'critical',
    category: 'performance',
    title: 'Render-blocking resource',
  }),
  makeIssue({
    severity: 'warning',
    category: 'seo',
    title: 'Missing alt text',
  }),
];

/** Empty array — no issues section rendered */
export const ISSUES_NONE: ScanIssue[] = [];

/** 30 issues — outlier / stress test */
export const ISSUES_MAX: ScanIssue[] = Array.from({ length: 30 }, (_, i) =>
  makeIssue({
    severity: i < 10 ? 'critical' : i < 20 ? 'warning' : 'info',
    title: `Issue #${i + 1}`,
    sort_order: i + 1,
  })
);

// ---------------------------------------------------------------------------
// Lead capture factories (POST /api/leads/capture)
// ---------------------------------------------------------------------------

export function makeLeadCaptured(leadId = 'lead-001') {
  return { status: 'captured' as const, lead_id: leadId };
}

export function makeLeadAlreadyCaptured(leadId = 'lead-001') {
  return { status: 'already_captured' as const, lead_id: leadId };
}
