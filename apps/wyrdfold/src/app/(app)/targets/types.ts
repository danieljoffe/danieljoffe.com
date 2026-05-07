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

export interface UserTarget {
  id: string;
  user_id: string;
  target_id: string;
  is_active: boolean;
  fit_score: number | null;
  fit_score_reasoning: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserTargetWithTarget {
  user_target: UserTarget;
  target: JobTarget;
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
