import { calculateGrade, type CategoryScores } from './grading.js';

describe('calculateGrade', () => {
  it('returns A for all perfect scores', () => {
    const scores: CategoryScores = {
      performance: 100,
      accessibility: 100,
      seo: 100,
      bestPractices: 100,
    };
    expect(calculateGrade(scores)).toMatchObject({
      grade: 'A',
      label: 'Excellent',
    });
  });

  it('returns A at the boundary (weighted = 90)', () => {
    // 90 * 0.4 + 90 * 0.25 + 90 * 0.2 + 90 * 0.15 = 90
    const scores: CategoryScores = {
      performance: 90,
      accessibility: 90,
      seo: 90,
      bestPractices: 90,
    };
    expect(calculateGrade(scores).grade).toBe('A');
  });

  it('returns B for weighted score between 75 and 89', () => {
    // 80 * 0.4 + 80 * 0.25 + 80 * 0.2 + 80 * 0.15 = 80
    const scores: CategoryScores = {
      performance: 80,
      accessibility: 80,
      seo: 80,
      bestPractices: 80,
    };
    const result = calculateGrade(scores);
    expect(result.grade).toBe('B');
    expect(result.label).toBe('Good');
  });

  it('returns C for weighted score between 60 and 74', () => {
    const scores: CategoryScores = {
      performance: 65,
      accessibility: 65,
      seo: 65,
      bestPractices: 65,
    };
    expect(calculateGrade(scores).grade).toBe('C');
  });

  it('returns D for weighted score between 40 and 59', () => {
    const scores: CategoryScores = {
      performance: 50,
      accessibility: 50,
      seo: 50,
      bestPractices: 50,
    };
    expect(calculateGrade(scores).grade).toBe('D');
  });

  it('returns F for weighted score below 40', () => {
    const scores: CategoryScores = {
      performance: 20,
      accessibility: 20,
      seo: 20,
      bestPractices: 20,
    };
    const result = calculateGrade(scores);
    expect(result.grade).toBe('F');
    expect(result.label).toBe('Critical');
  });

  it('returns F for all zeros', () => {
    const scores: CategoryScores = {
      performance: 0,
      accessibility: 0,
      seo: 0,
      bestPractices: 0,
    };
    expect(calculateGrade(scores).grade).toBe('F');
  });

  it('weights performance at 40%', () => {
    // High performance, low everything else
    // 95 * 0.4 + 50 * 0.25 + 50 * 0.2 + 50 * 0.15 = 38 + 12.5 + 10 + 7.5 = 68
    const scores: CategoryScores = {
      performance: 95,
      accessibility: 50,
      seo: 50,
      bestPractices: 50,
    };
    expect(calculateGrade(scores).grade).toBe('C');
  });

  it('returns a color string with each grade', () => {
    const scores: CategoryScores = {
      performance: 50,
      accessibility: 50,
      seo: 50,
      bestPractices: 50,
    };
    const result = calculateGrade(scores);
    expect(result.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});
