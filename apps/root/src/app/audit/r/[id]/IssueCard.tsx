import { Badge, Card, Stack } from '@danieljoffe.com/shared-ui';
import type { ScanIssue } from '@danieljoffe.com/shared-audit';

const severityVariant = {
  critical: 'error',
  warning: 'warning',
  info: 'info',
} as const;

const difficultyVariant = {
  easy: 'success',
  moderate: 'warning',
  complex: 'error',
} as const;

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
    <Card className='w-full'>
      <Stack direction='vertical' gap='sm'>
        <Stack direction='horizontal' gap='xs' className='flex-wrap'>
          <Badge variant={severityVariant[issue.severity]}>
            {issue.severity}
          </Badge>
          <Badge>{categoryLabels[issue.category] || issue.category}</Badge>
          {issue.fix_difficulty && (
            <Badge variant={difficultyVariant[issue.fix_difficulty]}>
              {issue.fix_difficulty} fix
            </Badge>
          )}
        </Stack>
        <h3 className='text-base font-semibold'>{issue.title}</h3>
        <p className='text-sm text-text-secondary'>{issue.description}</p>
        {issue.impact && (
          <p className='text-sm text-text-tertiary italic'>{issue.impact}</p>
        )}
      </Stack>
    </Card>
  );
}
