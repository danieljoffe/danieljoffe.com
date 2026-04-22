// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MOCK_SCAN_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
export const INVALID_UUID = 'not-a-uuid';
export const NONEXISTENT_UUID = '00000000-0000-0000-0000-000000000000';

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
// Lead capture factories (POST /api/leads/capture)
// ---------------------------------------------------------------------------

export function makeLeadCaptured(leadId = 'lead-001') {
  return { status: 'captured' as const, lead_id: leadId };
}

export function makeLeadAlreadyCaptured(leadId = 'lead-001') {
  return { status: 'already_captured' as const, lead_id: leadId };
}
