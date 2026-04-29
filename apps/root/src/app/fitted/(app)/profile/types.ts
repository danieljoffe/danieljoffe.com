// TypeScript mirror of the Pydantic shapes in apps/job-api/app/models/experience.py
// and apps/job-api/app/models/conversation.py.

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

export interface ProseDoc {
  id: string;
  user_id: string | null;
  version: number;
  content: string;
  created_at: string;
}

// API returns either the record or `{ prose: null }` when empty.
export type ProseResponse = ProseDoc | { prose: null };

export function hasProse(value: ProseResponse): value is ProseDoc {
  return 'id' in value;
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

// API returns either the record or `{ optimized: null }` when empty.
export type OptimizedResponse = OptimizedDoc | { optimized: null };

export type GapTier = 'red' | 'yellow' | 'green';

export interface Gap {
  kind: string;
  ref: string;
  priority: number;
  context: string;
}

export interface GapHealthResult {
  gap_pct: number;
  tier: GapTier;
  gaps: Gap[];
  total_weight: number;
  gap_weight: number;
}

export function hasOptimized(value: OptimizedResponse): value is OptimizedDoc {
  return 'id' in value;
}

// -- Gap labels ---------------------------------------------------------------

export const GAP_KIND_LABELS: Record<string, string> = {
  'role.missing_outcomes': 'Missing outcomes',
  'outcome.missing_metric': 'Missing metric',
  'role.missing_summary': 'Missing summary',
  'role.missing_end_date': 'Missing end date',
  'skill.missing_evidence': 'Missing evidence',
  'content.empty': 'No content',
};

export const GAP_KIND_WEIGHTS: Record<string, number> = {
  'role.missing_outcomes': 5,
  'outcome.missing_metric': 3,
  'role.missing_summary': 2,
  'role.missing_end_date': 1,
  'skill.missing_evidence': 1,
  'content.empty': 0,
};
