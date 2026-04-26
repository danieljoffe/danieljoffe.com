export const JOB_STATUSES = [
  'new',
  'saved',
  'resume_draft',
  'resume_ready',
  'applied',
  'interviewing',
  'offer',
  'rejected',
  'archived',
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export type ScoringStatus = 'stage1' | 'stage2' | 'complete';

export interface JobPosting {
  id: string;
  external_id: string;
  title: string;
  company_name: string;
  location: string | null;
  absolute_url: string | null;
  score: number;
  score_breakdown: Record<string, number> | null;
  scoring_status: ScoringStatus | undefined;
  status: string;
  salary_text: string | null;
  greenhouse_updated_at: string | null;
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

// ---------------------------------------------------------------------------
// Resume lifecycle types (#505)
// ---------------------------------------------------------------------------

export interface TailoredBullet {
  text: string;
  source_outcome_ref: string | null;
}

export interface TailoredRole {
  company: string;
  title: string;
  location: string | null;
  start: string;
  end: string | null;
  bullets: TailoredBullet[];
  source_role_ref: string;
}

export interface TailoredEducation {
  school: string;
  degree: string | null;
  dates: string | null;
}

export interface ContactInfo {
  name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  website: string | null;
  linkedin: string | null;
}

export interface TailoredResumePayload {
  summary: string;
  contact: ContactInfo;
  experience: TailoredRole[];
  skills: string[];
  education: TailoredEducation[];
  resume_type: string;
  jd_snippet: string;
  preferences_applied: string[];
}

export interface LintViolation {
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface TailoredResumeRecord {
  id: string;
  user_id: string | null;
  job_posting_id: string | null;
  document_type: 'resume' | 'cover_letter';
  resume_type: string;
  jd_snapshot: string;
  jd_snapshot_hash: string;
  payload: TailoredResumePayload | CoverLetterPayload;
  storage_path: string | null;
  warnings: string[];
  model: string | null;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  latency_ms: number;
  created_at: string;
  updated_at: string | null;
  approved_at: string | null;
  source_resume_id: string | null;
}

export interface CoverLetterParagraph {
  text: string;
}

export interface CoverLetterPayload {
  contact: ContactInfo;
  recipient_company: string;
  recipient_role: string | null;
  salutation: string;
  paragraphs: CoverLetterParagraph[];
  closing: string;
  signature: string;
  jd_snippet: string;
  preferences_applied: string[];
  source_outcome_refs: string[];
  source_role_refs: string[];
  source_skill_refs: string[];
}

export interface TailorResponse {
  record: TailoredResumeRecord;
  lint_warnings: LintViolation[];
}

export interface StatusLogEntry {
  id: string;
  old_status: string | null;
  new_status: string;
  note: string | null;
  created_at: string;
}
