export type Period = '7d' | '30d' | '90d' | 'all';

// ── Pipeline ────────────────────────────────────────────────────────────────

export interface WeeklyCount {
  week_start: string;
  resumes_generated: number;
  applications_submitted: number;
}

export interface FunnelStage {
  stage: string;
  count: number;
}

export interface PipelinePeriodKpis {
  total_applications: number;
  total_interviews: number;
  total_offers: number;
  response_rate: number | null;
  avg_days_to_response: number | null;
}

export interface PipelineInsights {
  total_applications: number;
  total_interviews: number;
  total_offers: number;
  response_rate: number | null;
  avg_days_to_response: number | null;
  velocity: WeeklyCount[];
  funnel: FunnelStage[];
  previous: PipelinePeriodKpis | null;
}

// ── Targets ────��──────────────────────────────────���─────────────────────────

export interface TargetComparison {
  target_id: string;
  target_label: string;
  job_count: number;
  avg_score: number;
  applied_count: number;
  interview_count: number;
  conversion_rate: number | null;
}

export interface ScoreBucket {
  bucket: string;
  count: number;
}

export interface ScoreTrendPoint {
  week_start: string;
  avg_score: number;
}

export interface TargetInsights {
  targets: TargetComparison[];
  score_distribution: ScoreBucket[];
  score_trend: ScoreTrendPoint[];
  unscored_count: number;
}

// ── Skills + Cost ─────��─────────────────────────────────────────────────────

export interface SkillFrequency {
  skill: string;
  matched_count: number;
  missing_count: number;
}

export interface MissingSkill {
  skill: string;
  missing_count: number;
  avg_job_score: number | null;
  priority_score: number;
}

export interface CostBucket {
  week_start: string;
  total_cost: number;
  resume_count: number;
}

export interface PurposeCost {
  purpose: string;
  total_cost: number;
  call_count: number;
}

export interface SkillsCostInsights {
  top_skills: SkillFrequency[];
  top_missing: MissingSkill[];
  cost_over_time: CostBucket[];
  cost_by_purpose: PurposeCost[];
  total_cost: number;
  avg_cost_per_resume: number | null;
}
