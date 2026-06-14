// Response types from /api/audit/insights/* endpoints consumed by the
// admin dashboard charts (the public audit insights pages were removed in the
// audit-tool teardown — issue #909 Phase B).

export interface ScoresData {
  period: number | null;
  averages: {
    performance: number | null;
    accessibility: number | null;
    bestPractices: number | null;
    seo: number | null;
    overall: number | null;
  };
  gradeDistribution: {
    A: number;
    B: number;
    C: number;
    D: number;
    F: number;
  };
  total: number;
}

export interface TrendPoint {
  bucketStart: string;
  avgOverall: number | null;
  scanCount: number;
}

export interface TrendsData {
  interval: 'weekly' | 'monthly';
  period: '3m' | '6m' | '12m';
  series: TrendPoint[];
}
