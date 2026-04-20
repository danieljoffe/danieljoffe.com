import type { ScanIssue } from '@danieljoffe.com/shared-audit';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import IssueCard from './IssueCard';

interface IssueListProps {
  issues: ScanIssue[];
}

export default function IssueList({ issues }: IssueListProps) {
  if (issues.length === 0) return null;

  const summary = {
    total: issues.length,
    critical: issues.filter(i => i.severity === 'critical').length,
    warning: issues.filter(i => i.severity === 'warning').length,
    info: issues.filter(i => i.severity === 'info').length,
  };

  return (
    <section
      aria-labelledby='issues-heading'
      className='w-full overflow-hidden flex flex-col justify-center'
    >
      <div className='max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 md:py-14'>
        <div className='flex flex-col gap-4'>
          <div>
            <Heading variant='section' as='h2' id='issues-heading'>
              Issues Found
            </Heading>
            <Text variant='body'>
              {summary.total} issues: {summary.critical} critical,{' '}
              {summary.warning} warnings, {summary.info} informational
            </Text>
          </div>

          <div className='flex flex-col gap-2'>
            {issues.map(issue => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
