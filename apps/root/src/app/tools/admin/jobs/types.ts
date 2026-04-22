export const JOB_STATUSES = [
  'new',
  'saved',
  'applied',
  'rejected',
  'archived',
] as const;

export const PROVIDERS = [
  'greenhouse',
  'lever',
  'ashby',
  'workday',
  'smartrecruiters',
  'jsonld',
] as const;

export type Provider = (typeof PROVIDERS)[number];

export interface JobPosting {
  id: string;
  external_id: string;
  title: string;
  company_name: string;
  location: string | null;
  absolute_url: string | null;
  score: number;
  score_breakdown: Record<string, number> | null;
  status: string;
  first_seen_at: string;
  created_at: string;
}

export interface JobsFilterState {
  minScore: string;
  status: string;
  company: string;
  search: string;
}

export type JobsSortColumn = 'score' | 'created_at' | 'company_name' | 'title';
