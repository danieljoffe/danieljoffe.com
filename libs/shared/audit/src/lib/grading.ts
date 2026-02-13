export interface GradeResult {
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  label: string;
  color: string;
}

export interface CategoryScores {
  performance: number;
  accessibility: number;
  seo: number;
  bestPractices: number;
}

export function calculateGrade(scores: CategoryScores): GradeResult {
  const weighted =
    scores.performance * 0.4 +
    scores.accessibility * 0.25 +
    scores.seo * 0.2 +
    scores.bestPractices * 0.15;

  if (weighted >= 90)
    return { grade: 'A', label: 'Excellent', color: '#63CAA5' };
  if (weighted >= 75) return { grade: 'B', label: 'Good', color: '#8C8FFF' };
  if (weighted >= 60)
    return { grade: 'C', label: 'Needs Work', color: '#FFB46B' };
  if (weighted >= 40) return { grade: 'D', label: 'Poor', color: '#FF8CA0' };
  return { grade: 'F', label: 'Critical', color: '#FF6B6B' };
}
