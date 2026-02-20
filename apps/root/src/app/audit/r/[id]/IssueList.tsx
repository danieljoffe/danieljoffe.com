import { PageContainer, Section, Stack } from '@danieljoffe.com/shared-ui';
import type { ScanIssue } from '@danieljoffe.com/shared-audit';
import IssueCard from './IssueCard';
import EmailGate from './EmailGate';

const FREE_ISSUE_COUNT = 3;

interface IssueListProps {
  issues: ScanIssue[];
  scanId: string;
}

export default function IssueList({ issues, scanId }: IssueListProps) {
  if (issues.length === 0) return null;

  const visibleIssues = issues.slice(0, FREE_ISSUE_COUNT);
  const gatedIssues = issues.slice(FREE_ISSUE_COUNT);

  const summary = {
    total: issues.length,
    critical: issues.filter(i => i.severity === 'critical').length,
    warning: issues.filter(i => i.severity === 'warning').length,
    info: issues.filter(i => i.severity === 'info').length,
  };

  return (
    <Section aria-labelledby='issues-heading' className='min-h-min max-h-max'>
      <PageContainer>
        <Stack direction='vertical' gap='md'>
          <div>
            <h2 id='issues-heading'>Issues Found</h2>
            <p className='text-sm text-foreground-muted'>
              {summary.total} issues: {summary.critical} critical,{' '}
              {summary.warning} warnings, {summary.info} informational
            </p>
          </div>

          <Stack direction='vertical' gap='sm'>
            {visibleIssues.map(issue => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </Stack>

          {gatedIssues.length > 0 && (
            <EmailGate gatedIssues={gatedIssues} scanId={scanId} />
          )}
        </Stack>
      </PageContainer>
    </Section>
  );
}
