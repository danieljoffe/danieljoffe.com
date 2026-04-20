import type { Scan } from '@danieljoffe.com/shared-audit';

export type CompareScan = Pick<
  Scan,
  | 'id'
  | 'url'
  | 'normalized_url'
  | 'status'
  | 'created_at'
  | 'completed_at'
  | 'device_mode'
  | 'grade_overall'
  | 'score_performance'
  | 'score_accessibility'
  | 'score_best_practices'
  | 'score_seo'
  | 'fcp_ms'
  | 'lcp_ms'
  | 'tbt_ms'
  | 'cls'
  | 'si_ms'
  | 'page_title'
  | 'page_screenshot_url'
>;

export const COMPARE_SCAN_FIELDS = [
  'id',
  'url',
  'normalized_url',
  'status',
  'created_at',
  'completed_at',
  'device_mode',
  'grade_overall',
  'score_performance',
  'score_accessibility',
  'score_best_practices',
  'score_seo',
  'fcp_ms',
  'lcp_ms',
  'tbt_ms',
  'cls',
  'si_ms',
  'page_title',
  'page_screenshot_url',
].join(', ');

export const COMPARE_SCAN_ISSUE_FIELDS =
  'id, scan_id, category, severity, title, description, impact, fix_difficulty, sort_order';
