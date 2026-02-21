import {
  LIGHTHOUSE_ISSUE_MAPPINGS,
  type IssueMapping,
} from '@danieljoffe.com/shared-audit';

export interface ParsedIssue {
  category: IssueMapping['category'];
  severity: IssueMapping['severity'];
  title: string;
  description: string;
  impact: string;
  fix_difficulty: IssueMapping['fixDifficulty'];
  technical_detail: Record<string, unknown>;
}

export function parseIssues(
  lighthouseResult: Record<string, unknown>,
  axeResult: Record<string, unknown>
): ParsedIssue[] {
  const issues: ParsedIssue[] = [];

  // Parse Lighthouse audits
  const audits =
    (lighthouseResult['audits'] as Record<string, Record<string, unknown>>) ??
    {};

  for (const [auditId, mapping] of Object.entries(LIGHTHOUSE_ISSUE_MAPPINGS)) {
    const audit = audits[auditId];
    if (!audit) continue;

    const score = audit['score'] as number | null | undefined;
    if (score === null || score === undefined || score >= 0.9) continue;

    const displayValue = (audit['displayValue'] as string) ?? '';
    const numericValue = (audit['numericValue'] as number) ?? 0;

    const description = mapping.descriptionTemplate.replace(
      '{value}',
      displayValue
    );

    issues.push({
      category: mapping.category,
      severity: mapping.severity,
      title: mapping.title,
      description,
      impact: mapping.impactTemplate,
      fix_difficulty: mapping.fixDifficulty,
      technical_detail: {
        auditId,
        score,
        displayValue,
        numericValue,
      },
    });
  }

  // Parse axe-core violations
  const violations =
    (axeResult['violations'] as Array<Record<string, unknown>>) ?? [];

  for (const violation of violations) {
    const violationId = violation['id'] as string;
    const alreadyCaptured = issues.some(i =>
      i.title.toLowerCase().includes(violationId.replace(/-/g, ' '))
    );
    if (alreadyCaptured) continue;

    const nodes = violation['nodes'] as Array<unknown> | undefined;
    const nodeCount = nodes?.length ?? 0;
    const impact = violation['impact'] as string;

    issues.push({
      category: 'accessibility',
      severity:
        impact === 'critical' || impact === 'serious'
          ? 'critical'
          : impact === 'moderate'
            ? 'warning'
            : 'info',
      title: (violation['help'] as string) ?? violationId,
      description: `${violation['description'] as string}. Found ${nodeCount} instance${nodeCount !== 1 ? 's' : ''} on this page.`,
      impact:
        'Fixing this improves usability for people using assistive technology and may improve your search ranking.',
      fix_difficulty: 'easy',
      technical_detail: {
        axeRuleId: violationId,
        impact,
        nodeCount,
        helpUrl: violation['helpUrl'] as string,
      },
    });
  }

  // Sort: critical first, then warning, then info
  // Within each severity: performance -> accessibility -> seo -> ux
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  const categoryOrder = { performance: 0, accessibility: 1, seo: 2, ux: 3 };

  issues.sort((a, b) => {
    const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return categoryOrder[a.category] - categoryOrder[b.category];
  });

  return issues;
}
