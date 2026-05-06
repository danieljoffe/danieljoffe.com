import { buildInsightsCsv, buildInsightsCsvFilename } from '../exportCsv';
import type {
  PipelineInsights,
  SkillsCostInsights,
  TargetInsights,
} from '../types';

const FIXED_DATE = new Date('2026-04-30T12:00:00.000Z');

const PIPELINE: PipelineInsights = {
  total_applications: 12,
  total_interviews: 3,
  total_offers: 1,
  response_rate: 0.25,
  avg_days_to_response: 5.4,
  velocity: [
    {
      week_start: '2026-04-13',
      resumes_generated: 3,
      applications_submitted: 2,
    },
  ],
  funnel: [
    { stage: 'new', count: 5 },
    { stage: 'applied', count: 3 },
  ],
};

const TARGETS: TargetInsights = {
  targets: [
    {
      target_id: 't1',
      target_label: 'Senior, "Frontend"',
      job_count: 10,
      avg_score: 72.4,
      applied_count: 5,
      interview_count: 2,
      conversion_rate: 0.4,
    },
  ],
  score_distribution: [{ bucket: '70-79', count: 4 }],
  score_trend: [{ week_start: '2026-04-13', avg_score: 71.2 }],
  unscored_count: 7,
};

const SKILLS_COST: SkillsCostInsights = {
  top_skills: [{ skill: 'React', matched_count: 8, missing_count: 1 }],
  top_missing: [
    {
      skill: 'Kubernetes',
      missing_count: 3,
      avg_job_score: 87.5,
      priority_score: 262.5,
    },
    {
      skill: 'GraphQL',
      missing_count: 2,
      avg_job_score: null,
      priority_score: 2,
    },
  ],
  cost_over_time: [
    { week_start: '2026-04-13', total_cost: 0.123, resume_count: 4 },
  ],
  cost_by_purpose: [{ purpose: 'tailor', total_cost: 0.4, call_count: 3 }],
  total_cost: 0.523,
  avg_cost_per_resume: 0.13,
};

describe('buildInsightsCsv', () => {
  it('emits one section per dataset with the period header', () => {
    const csv = buildInsightsCsv({
      period: '30d',
      pipeline: PIPELINE,
      targets: TARGETS,
      skillsCost: SKILLS_COST,
      generatedAt: FIXED_DATE,
    });

    expect(csv).toContain('## Export metadata');
    expect(csv).toContain('Period,30d');
    expect(csv).toContain('Generated at,2026-04-30T12:00:00.000Z');
    expect(csv).toContain('## Pipeline summary');
    expect(csv).toContain('## Pipeline funnel');
    expect(csv).toContain('## Weekly activity');
    expect(csv).toContain('## Target comparison');
    expect(csv).toContain('## Score distribution');
    expect(csv).toContain('## Score trend');
    expect(csv).toContain('## Skill mentions');
    expect(csv).toContain('## What to learn next');
    expect(csv).toContain('## LLM cost over time');
    expect(csv).toContain('## LLM cost by purpose');
  });

  it('escapes commas and double quotes in cell values', () => {
    const csv = buildInsightsCsv({
      period: '30d',
      pipeline: undefined,
      targets: TARGETS,
      skillsCost: undefined,
      generatedAt: FIXED_DATE,
    });

    expect(csv).toContain('"Senior, ""Frontend"""');
  });

  it('skips datasets that did not load', () => {
    const csv = buildInsightsCsv({
      period: '7d',
      pipeline: PIPELINE,
      targets: undefined,
      skillsCost: undefined,
      generatedAt: FIXED_DATE,
    });

    expect(csv).toContain('## Pipeline summary');
    expect(csv).not.toContain('## Target comparison');
    expect(csv).not.toContain('## Skill mentions');
  });

  it('appends unscored count as the final score-distribution row', () => {
    const csv = buildInsightsCsv({
      period: '30d',
      pipeline: undefined,
      targets: TARGETS,
      skillsCost: undefined,
      generatedAt: FIXED_DATE,
    });

    expect(csv).toContain('Unscored,7');
  });

  it('renders null avg_job_score as an empty cell', () => {
    const csv = buildInsightsCsv({
      period: '30d',
      pipeline: undefined,
      targets: undefined,
      skillsCost: SKILLS_COST,
      generatedAt: FIXED_DATE,
    });

    // The GraphQL row (missing_count=2, avg_job_score=null, priority=2)
    expect(csv).toContain('GraphQL,2,,2');
  });
});

describe('buildInsightsCsvFilename', () => {
  it('embeds the period and a yyyymmdd date', () => {
    const filename = buildInsightsCsvFilename(
      '90d',
      new Date('2026-04-30T08:00:00.000Z')
    );
    // Local date components vary by timezone; assert the structural pieces.
    expect(filename).toMatch(/^insights-90d-\d{8}\.csv$/);
  });
});
