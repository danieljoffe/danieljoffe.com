import type { ScanIssue } from '@danieljoffe.com/shared-audit';
import type { BadgeVariant } from '@danieljoffe.com/shared-ui';
import ClientBadge from '@/components/ClientBadge';

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
          <ClientBadge variant={severityMap[issue.severity] ?? 'default'}>
            {issue.severity}
          </ClientBadge>
          <ClientBadge variant='default'>
            {categoryLabels[issue.category] || issue.category}
          </ClientBadge>
          {issue.fix_difficulty && (
            <ClientBadge
              variant={difficultyMap[issue.fix_difficulty] ?? 'default'}
            >
              {issue.fix_difficulty} fix
            </ClientBadge>
          )}
        </div>
        <h3 className='text-base font-semibold'>{issue.title}</h3>
        <p className='text-sm text-text-secondary'>{issue.description}</p>
        {issue.impact && (
          <p className='text-sm text-text-tertiary italic'>{issue.impact}</p>
        )}
      </div>
    </div>
  );
}
