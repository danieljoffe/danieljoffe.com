'use client';

import { useEffect } from 'react';
import { analytics } from '@/lib/analytics';

interface ReportAnalyticsProps {
  scanId: string;
  grade: string;
}

export default function ReportAnalytics({
  scanId,
  grade,
}: ReportAnalyticsProps) {
  useEffect(() => {
    analytics.auditScanCompleted(scanId, grade);
  }, [scanId, grade]);

  return null;
}
