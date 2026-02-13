export interface Scan {
  id: string;
  url: string;
  normalized_url: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  created_at: string;
  completed_at: string | null;
  error_message: string | null;
  score_performance: number | null;
  score_accessibility: number | null;
  score_best_practices: number | null;
  score_seo: number | null;
  grade_overall: 'A' | 'B' | 'C' | 'D' | 'F' | null;
  fcp_ms: number | null;
  lcp_ms: number | null;
  tbt_ms: number | null;
  cls: number | null;
  si_ms: number | null;
  page_title: string | null;
  page_description: string | null;
  page_screenshot_url: string | null;
  lighthouse_raw: Record<string, unknown> | null;
  axe_raw: Record<string, unknown> | null;
  source: string;
  ip_hash: string | null;
}

export interface ScanIssue {
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

export interface Lead {
  id: string;
  scan_id: string | null;
  email: string;
  name: string | null;
  company: string | null;
  url_scanned: string | null;
  source: string;
  created_at: string;
  email_sequence_step: number;
  last_email_at: string | null;
  unsubscribed: boolean;
  unsubscribed_at: string | null;
}

export interface EmailLog {
  id: string;
  lead_id: string;
  template: string;
  sent_at: string;
  resend_id: string | null;
}

export interface GradeInfo {
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  label: string;
  color: string;
}

export const GRADE_MAP: Record<string, GradeInfo> = {
  A: { grade: 'A', label: 'Excellent', color: '#63CAA5' },
  B: { grade: 'B', label: 'Good', color: '#8C8FFF' },
  C: { grade: 'C', label: 'Needs Work', color: '#FFB46B' },
  D: { grade: 'D', label: 'Poor', color: '#FF8CA0' },
  F: { grade: 'F', label: 'Critical', color: '#FF6B6B' },
};
