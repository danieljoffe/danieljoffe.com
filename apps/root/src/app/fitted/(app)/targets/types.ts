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

export interface ResumeEmphasis {
  focus_skills: string[];
  focus_outcomes: string[];
  tone: string | null;
}

export interface JobTarget {
  id: string;
  user_id: string | null;
  label: string;
  scoring_profile: ScoringProfile;
  resume_emphasis: ResumeEmphasis;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TargetReferenceJD {
  id: string;
  target_id: string;
  jd_url: string | null;
  jd_text: string;
  extracted_profile: ScoringProfile;
  created_at: string;
}

export function emptyScoringProfile(): ScoringProfile {
  return {
    categories: {},
    seniority: { level: null, signals: [] },
    domain: { signals: [], weight: 0.5 },
    negative: { keywords: [], weight: -10 },
  };
}

export function emptyResumeEmphasis(): ResumeEmphasis {
  return {
    focus_skills: [],
    focus_outcomes: [],
    tone: null,
  };
}
