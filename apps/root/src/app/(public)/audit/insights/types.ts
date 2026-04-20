// Response types from /api/audit/insights/* endpoints

export interface SummaryData {
  totalScans: number;
  uniqueDomains: number;
  avgOverallScore: number | null;
  topViolation: string | null;
}

export interface Violation {
  category: 'performance' | 'accessibility' | 'seo' | 'ux';
  title: string;
  occurrenceCount: number;
  severity: {
    critical: number;
    warning: number;
    info: number;
  };
}

export interface ViolationsData {
  category: 'performance' | 'accessibility' | 'seo' | 'ux' | 'all';
  limit: number;
  violations: Violation[];
}

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

export interface DomainEntry {
  domain: string;
  scanCount: number;
  latestGrade: string | null;
  latestScanAt: string | null;
}

export interface DomainsData {
  limit: number;
  domains: DomainEntry[];
}
