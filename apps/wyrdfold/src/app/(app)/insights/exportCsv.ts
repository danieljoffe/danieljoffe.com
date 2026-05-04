import type {
  Period,
  PipelineInsights,
  SkillsCostInsights,
  TargetInsights,
} from './types';

type Cell = string | number | null | undefined;

interface Section {
  title: string;
  headers: string[];
  rows: Cell[][];
}

function escapeCell(value: Cell): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function renderSection(section: Section): string {
  const lines = [`## ${section.title}`];
  lines.push(section.headers.map(escapeCell).join(','));
  for (const row of section.rows) {
    lines.push(row.map(escapeCell).join(','));
  }
  return lines.join('\n');
}

/**
 * Build a multi-section CSV text representation of the insights dashboard.
 * Each dataset becomes its own section, separated by a blank line. Opens
 * in any spreadsheet as a single sheet — sections are visually separated
 * by the `## Title` markers.
 */
export function buildInsightsCsv(input: {
  period: Period;
  pipeline: PipelineInsights | undefined;
  targets: TargetInsights | undefined;
  skillsCost: SkillsCostInsights | undefined;
  generatedAt?: Date;
}): string {
  const generatedAt = input.generatedAt ?? new Date();
  const sections: Section[] = [];

  sections.push({
    title: 'Export metadata',
    headers: ['Field', 'Value'],
    rows: [
      ['Period', input.period],
      ['Generated at', generatedAt.toISOString()],
    ],
  });

  if (input.pipeline) {
    const p = input.pipeline;
    sections.push({
      title: 'Pipeline summary',
      headers: [
        'Applications',
        'Interviews',
        'Offers',
        'Response rate',
        'Avg days to response',
      ],
      rows: [
        [
          p.total_applications,
          p.total_interviews,
          p.total_offers,
          p.response_rate ?? '',
          p.avg_days_to_response ?? '',
        ],
      ],
    });

    sections.push({
      title: 'Pipeline funnel',
      headers: ['Stage', 'Count'],
      rows: p.funnel.map(f => [f.stage, f.count]),
    });

    sections.push({
      title: 'Weekly activity',
      headers: ['Week', 'Resumes generated', 'Applications submitted'],
      rows: p.velocity.map(v => [
        v.week_start,
        v.resumes_generated,
        v.applications_submitted,
      ]),
    });
  }

  if (input.targets) {
    const t = input.targets;
    sections.push({
      title: 'Target comparison',
      headers: [
        'Target',
        'Job count',
        'Avg score',
        'Applied',
        'Interviews',
        'Conversion rate',
      ],
      rows: t.targets.map(c => [
        c.target_label,
        c.job_count,
        c.avg_score,
        c.applied_count,
        c.interview_count,
        c.conversion_rate ?? '',
      ]),
    });

    sections.push({
      title: 'Score distribution',
      headers: ['Score range', 'Count'],
      rows: [
        ...t.score_distribution.map(b => [b.bucket, b.count]),
        ['Unscored', t.unscored_count],
      ],
    });

    sections.push({
      title: 'Score trend',
      headers: ['Week', 'Avg score'],
      rows: t.score_trend.map(p => [p.week_start, p.avg_score]),
    });
  }

  if (input.skillsCost) {
    const s = input.skillsCost;
    sections.push({
      title: 'Skill mentions',
      headers: ['Skill', 'Matched', 'Missing'],
      rows: s.top_skills.map(sk => [
        sk.skill,
        sk.matched_count,
        sk.missing_count,
      ]),
    });

    sections.push({
      title: 'What to learn next',
      headers: ['Skill', 'Missing in N jobs', 'Avg job score', 'Priority'],
      rows: s.top_missing.map(m => [
        m.skill,
        m.missing_count,
        m.avg_job_score ?? '',
        m.priority_score,
      ]),
    });

    sections.push({
      title: 'LLM cost over time',
      headers: ['Week', 'Total cost (USD)', 'Resume count'],
      rows: s.cost_over_time.map(b => [
        b.week_start,
        b.total_cost,
        b.resume_count,
      ]),
    });

    sections.push({
      title: 'LLM cost by purpose',
      headers: ['Purpose', 'Total cost (USD)', 'Call count'],
      rows: s.cost_by_purpose.map(c => [c.purpose, c.total_cost, c.call_count]),
    });
  }

  return sections.map(renderSection).join('\n\n');
}

export function buildInsightsCsvFilename(period: Period, now?: Date): string {
  const d = now ?? new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `insights-${period}-${yyyy}${mm}${dd}.csv`;
}

export function downloadInsightsCsv(input: {
  period: Period;
  pipeline: PipelineInsights | undefined;
  targets: TargetInsights | undefined;
  skillsCost: SkillsCostInsights | undefined;
}): void {
  const text = buildInsightsCsv(input);
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = buildInsightsCsvFilename(input.period);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
