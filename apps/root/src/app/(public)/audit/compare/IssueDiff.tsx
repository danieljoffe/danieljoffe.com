import { CheckCircle, AlertTriangle, MinusCircle } from 'lucide-react';
import { Heading } from '@danieljoffe/shared-ui/Heading';
import { Section } from '@danieljoffe/shared-ui/Section';
import { Text } from '@danieljoffe/shared-ui/Text';
import type { ScanIssue } from '@danieljoffe.com/shared-audit';
import IssueCard from '../r/[id]/IssueCard';
import { diffIssues } from './calcDelta';

interface IssueDiffProps {
  issuesA: ScanIssue[];
  issuesB: ScanIssue[];
}

interface GroupProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  issues: ScanIssue[];
  emptyLabel: string;
}

function Group({ title, description, icon, issues, emptyLabel }: GroupProps) {
  return (
    <div className='flex flex-col gap-3'>
      <div className='flex items-center gap-2'>
        {icon}
        <Heading variant='cardTitle' as='h3'>
          {title}
        </Heading>
        <span
          className='text-text-secondary font-normal tabular-nums text-sm'
          aria-label={`${issues.length} ${issues.length === 1 ? 'issue' : 'issues'}`}
        >
          ({issues.length})
        </span>
      </div>
      <Text variant='detail'>{description}</Text>
      {issues.length === 0 ? (
        <div className='rounded-lg border border-dashed border-border p-6 text-center'>
          <Text variant='body' className='text-text-secondary'>
            {emptyLabel}
          </Text>
        </div>
      ) : (
        <div className='flex flex-col gap-3'>
          {issues.map(issue => (
            <IssueCard key={issue.id} issue={issue} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function IssueDiff({ issuesA, issuesB }: IssueDiffProps) {
  const { resolved, added, persisted } = diffIssues(issuesA, issuesB);

  return (
    <Section aria-labelledby='issue-diff-heading' overflow='hidden'>
      <Heading variant='section' as='h2' id='issue-diff-heading'>
        Issues
      </Heading>
      <Text variant='detail' className='mb-6'>
        Issues resolved, newly introduced, and still present between the two
        scans.
      </Text>

      <div className='flex flex-col gap-10'>
        <Group
          title='Resolved'
          description='Issues that appeared in the previous scan but not the current one.'
          icon={
            <CheckCircle className='size-5 text-success' aria-hidden='true' />
          }
          issues={resolved}
          emptyLabel='No issues were resolved.'
        />
        <Group
          title='New'
          description='Issues that appeared in the current scan but not the previous one.'
          icon={
            <AlertTriangle className='size-5 text-warning' aria-hidden='true' />
          }
          issues={added}
          emptyLabel='No new issues were introduced.'
        />
        <Group
          title='Still present'
          description='Issues that appear in both scans.'
          icon={
            <MinusCircle
              className='size-5 text-text-secondary'
              aria-hidden='true'
            />
          }
          issues={persisted.map(p => p.b)}
          emptyLabel='No overlapping issues between scans.'
        />
      </div>
    </Section>
  );
}
