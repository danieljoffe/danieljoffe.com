export interface CategoryProfile {
  keywords: Record<string, number>; // keyword -> weight 1-3
  weight: number; // category multiplier
}

export interface SeniorityProfile {
  level: string | null;
  signals: string[];
}

export interface DomainProfile {
  signals: string[];
  weight: number;
}

export interface NegativeProfile {
  keywords: string[];
  weight: number;
}

export interface ScoringProfile {
  categories: Record<string, CategoryProfile>;
  seniority: SeniorityProfile;
  domain: DomainProfile;
  negative: NegativeProfile;
}

export interface JobTarget {
  id: string;
  label: string;
  description: string | null;
  normalized_label: string | null;
  scoring_profile: ScoringProfile;
  search_keywords: string[];
  activation_status: string;
  profile_version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Per-(user, target) read-time multiplier on Phase 2's four-axis scorecard.
 *
 * All four weights are in [0, 1]. Defaults are equal quartile (0.25
 * each) so the displayed score reproduces the underlying holistic
 * `raw_score`. The backend does NOT auto-normalize the inputs — at
 * read time it divides by the sum, so any values that sum to a non-zero
 * positive number produce a valid normalized blend.
 */
export interface AxisWeights {
  title_fit: number;
  skills_fit: number;
  seniority_fit: number;
  domain_fit: number;
}

export interface UserTarget {
  id: string;
  user_id: string;
  target_id: string;
  is_active: boolean;
  fit_score: number | null;
  fit_score_reasoning: string | null;
  /** NULL = use defaults (equal quartile). Wyrdfold-API PR E. */
  axis_weights: AxisWeights | null;
  /** One-step-back snapshot for the undo button. NULL = nothing to undo. */
  axis_weights_previous: AxisWeights | null;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_AXIS_WEIGHTS: AxisWeights = {
  title_fit: 0.25,
  skills_fit: 0.25,
  seniority_fit: 0.25,
  domain_fit: 0.25,
};

/** Order matters: this is the canonical render order for the four sliders. */
export const AXIS_KEYS = [
  'title_fit',
  'skills_fit',
  'seniority_fit',
  'domain_fit',
] as const satisfies readonly (keyof AxisWeights)[];

export type AxisKey = (typeof AXIS_KEYS)[number];

export interface UserTargetWithTarget {
  user_target: UserTarget;
  target: JobTarget;
}

/**
 * List-view projection of {@link JobTarget} (#863). The API omits the heavy
 * `scoring_profile` JSONB on list endpoints and instead sends the two counts
 * the list UI renders. Fetch the full target via `GET /targets/{id}` when the
 * detail view needs the profile itself.
 */
export interface JobTargetSummary {
  id: string;
  label: string;
  description: string | null;
  normalized_label: string | null;
  activation_status: string;
  profile_version: number;
  is_active: boolean;
  seniority_hint: string | null;
  keyword_count: number;
  category_count: number;
  created_at: string;
  updated_at: string;
}

export interface UserTargetWithSummary {
  user_target: UserTarget;
  target: JobTargetSummary;
}

/** Project a full {@link JobTarget} down to its list summary, deriving the
 * counts locally — used at the create/suggestion/poll boundaries where the
 * API still returns a full target but list state holds summaries. */
export function toSummary(target: JobTarget): JobTargetSummary {
  const categories = target.scoring_profile?.categories ?? {};
  const keywordCount = Object.values(categories).reduce(
    (sum, cat) => sum + Object.keys(cat?.keywords ?? {}).length,
    0
  );
  return {
    id: target.id,
    label: target.label,
    description: target.description,
    normalized_label: target.normalized_label,
    activation_status: target.activation_status,
    profile_version: target.profile_version,
    is_active: target.is_active,
    seniority_hint: null,
    keyword_count: keywordCount,
    category_count: Object.keys(categories).length,
    created_at: target.created_at,
    updated_at: target.updated_at,
  };
}

export interface CreateOrLinkResult {
  user_target: UserTarget;
  target: JobTarget;
  was_matched: boolean;
}

export interface TargetReferenceJD {
  id: string;
  target_id: string;
  jd_url: string | null;
  jd_text: string;
  extracted_profile: ScoringProfile;
  created_at: string;
}

export interface TargetSuggestion {
  label: string;
  description: string;
  core_skills: string[];
}

export interface MatchedSuggestion {
  suggestion: TargetSuggestion;
  matched_target: JobTarget | null;
  is_new: boolean;
}

export interface MatchedSuggestions {
  matches: MatchedSuggestion[];
}

export function emptyScoringProfile(): ScoringProfile {
  return {
    categories: {},
    seniority: { level: null, signals: [] },
    domain: { signals: [], weight: 0.5 },
    negative: { keywords: [], weight: -10 },
  };
}
