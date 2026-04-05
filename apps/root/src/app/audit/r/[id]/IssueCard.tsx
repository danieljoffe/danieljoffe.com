import type { ScanIssue } from '@danieljoffe.com/shared-audit';
import { Badge, type BadgeVariant } from '@danieljoffe.com/shared-ui/Badge';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Text } from '@danieljoffe.com/shared-ui/Text';

const severityMap: Record<string, BadgeVariant> = {
  critical: 'error',
  warning: 'warning',
  info: 'info',
};

const difficultyMap: Record<string, BadgeVariant> = {
  easy: 'success',
  moderate: 'warning',
  complex: 'error',
};

const categoryLabels: Record<string, string> = {
  performance: 'Performance',
  accessibility: 'Accessibility',
  seo: 'SEO',
  ux: 'UX',
};

interface IssueCardProps {
  issue: ScanIssue;
}

export default function IssueCard({ issue }: IssueCardProps) {
  return (
    <div className='rounded-lg border border-border bg-surface-elevated p-6 w-full'>
      <div className='flex flex-col gap-2'>
        <div className='flex flex-row gap-1 flex-wrap'>
          <Badge variant={severityMap[issue.severity] ?? 'default'}>
            {issue.severity}
          </Badge>
          <Badge variant='default'>
            {categoryLabels[issue.category] || issue.category}
          </Badge>
          {issue.fix_difficulty && (
            <Badge variant={difficultyMap[issue.fix_difficulty] ?? 'default'}>
              {issue.fix_difficulty} fix
            </Badge>
          )}
        </div>
        <Heading variant='cardTitle' as='h3'>
          {issue.title}
        </Heading>
        <Text variant='body'>{issue.description}</Text>
        {issue.impact && (
          <Text variant='caption' className='italic'>
            {issue.impact}
          </Text>
        )}
      </div>
    </div>
  );
}
