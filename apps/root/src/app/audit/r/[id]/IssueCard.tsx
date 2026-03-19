import type { ScanIssue } from '@danieljoffe.com/shared-audit';

const severityStyles = {
  critical: 'bg-error-light text-error border border-error/30',
  warning: 'bg-warning-light text-warning border border-warning/30',
  info: 'bg-info-light text-info border border-info/30',
} as const;

const difficultyStyles = {
  easy: 'bg-success-light text-success border border-success/30',
  moderate: 'bg-warning-light text-warning border border-warning/30',
  complex: 'bg-error-light text-error border border-error/30',
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
    <div className='rounded-lg border border-border bg-surface-elevated p-6 w-full'>
      <div className='flex flex-col gap-2'>
        <div className='flex flex-row gap-1 flex-wrap'>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${severityStyles[issue.severity]}`}
          >
            {issue.severity}
          </span>
          <span className='inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-surface-elevated text-text-secondary border border-border'>
            {categoryLabels[issue.category] || issue.category}
          </span>
          {issue.fix_difficulty && (
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${difficultyStyles[issue.fix_difficulty]}`}
            >
              {issue.fix_difficulty} fix
            </span>
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
