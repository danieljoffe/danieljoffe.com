// TypeScript mirror of the Pydantic shapes in apps/job-api/app/models/experience.py.
// Kept narrow to what this dashboard consumes; grow as new endpoints are wired.

export interface ProseDoc {
  id: string;
  user_id: string | null;
  version: number;
  content: string;
  created_at: string;
}

export interface Outcome {
  description: string;
  metric: string | null;
  value: string | null;
  role_ref: string | null;
}

export interface Role {
  id: string;
  company: string;
  title: string;
  start: string;
  end: string | null;
  summary: string | null;
  skills: string[];
  outcome_refs: string[];
}

export interface Skill {
  name: string;
  evidence_refs: string[];
  years: number | null;
}

export interface OptimizedPayload {
  summary: string | null;
  roles: Role[];
  skills: Skill[];
  outcomes: Outcome[];
}

export type OptimizedDocSource = 'llm' | 'user_edit';

export interface OptimizedDoc {
  id: string;
  user_id: string | null;
  prose_doc_id: string | null;
  version: number;
  payload: OptimizedPayload;
  markdown_view: string | null;
  source: OptimizedDocSource;
  created_at: string;
}

// The route handlers return either the record or `{ prose: null } / { optimized: null }`
// when the table is empty. The discriminator is that the payload fields are absent.
export type ProseResponse = ProseDoc | { prose: null };
export type OptimizedResponse = OptimizedDoc | { optimized: null };

// Gap health (#498)
export type GapTier = 'red' | 'orange' | 'yellow' | 'lime' | 'green';

export interface GapHealthResult {
  gap_pct: number;
  tier: GapTier;
  gaps: Array<{
    kind: string;
    ref: string;
    priority: number;
    context: string;
  }>;
  total_weight: number;
  gap_weight: number;
}
