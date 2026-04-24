export const JOB_STATUSES = [
  'new',
  'saved',
  'applied',
  'rejected',
  'archived',
  'resume_draft',
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

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
  search: string;
}

export type JobsSortColumn = 'score' | 'created_at' | 'company_name' | 'title';

export interface SkillMatch {
  name: string;
  matched: boolean;
  confidence: 'high' | 'medium' | 'low';
  evidence: string | null;
}

export interface Scorecard {
  skills_matched: SkillMatch[];
  skills_missing: string[];
  nice_to_haves: string[];
  seniority_fit: 'strong' | 'moderate' | 'weak';
  seniority_rationale: string;
  domain_fit: 'strong' | 'moderate' | 'weak';
  domain_rationale: string;
}

export interface JobAnalysis {
  id: string;
  job_posting_id: string;
  scorecard: Scorecard;
  recommendation: string;
  model: string;
  cost_usd: number;
  latency_ms: number;
  created_at: string;
}
