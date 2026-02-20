import Link from 'next/link';
import { ArrowLeft, Globe } from 'lucide-react';
import { PageContainer, Section, Stack } from '@danieljoffe.com/shared-ui';
import { GRADE_MAP } from '@danieljoffe.com/shared-audit';

interface ReportHeaderProps {
  url: string;
  pageTitle: string | null;
  screenshotUrl: string | null;
  gradeOverall: string | null;
  completedAt: string | null;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ReportHeader({
  url,
  pageTitle,
  screenshotUrl,
  gradeOverall,
  completedAt,
}: ReportHeaderProps) {
  const grade = gradeOverall ? GRADE_MAP[gradeOverall] : null;

  return (
    <Section
      className='min-h-min max-h-max'
      aria-labelledby='report-header-heading'
      background='alt'
    >
      <PageContainer className='py-12 md:py-16'>
        <Stack direction='vertical' gap='lg'>
          <Link
            href='/audit'
            className='inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors'
          >
            <ArrowLeft className='size-4' aria-hidden='true' />
            New audit
          </Link>

          <div className='flex flex-col md:flex-row md:items-start md:justify-between gap-6'>
            <Stack direction='horizontal' gap='md' align='start'>
              {screenshotUrl ? (
                <picture>
                  <img
                    src={screenshotUrl}
                    alt={`Screenshot of ${pageTitle || url}`}
                    className='w-16 h-12 rounded border border-border object-cover shrink-0'
                  />
                </picture>
              ) : (
                <span className='inline-flex items-center justify-center w-16 h-12 rounded border border-border bg-background-elevated shrink-0'>
                  <Globe
                    className='size-6 text-foreground-subtle'
                    aria-hidden='true'
                  />
                </span>
              )}
              <div className='min-w-0'>
                <h1
                  id='report-header-heading'
                  className='font-heading text-2xl md:text-3xl font-semibold tracking-tight'
                >
                  {pageTitle || url}
                </h1>
                <p className='text-sm text-foreground-muted truncate max-w-md mt-1'>
                  {url}
                </p>
                {completedAt && (
                  <p className='text-xs text-foreground-subtle mt-1'>
                    Scanned {formatDate(completedAt)}
                  </p>
                )}
              </div>
            </Stack>

            {grade && (
              <div
                className='flex flex-col items-center shrink-0'
                aria-label={`Overall grade: ${grade.grade}, ${grade.label}`}
              >
                <span
                  className='inline-flex items-center justify-center size-16 rounded-xl text-3xl font-bold text-white'
                  style={{ backgroundColor: grade.color }}
                >
                  {grade.grade}
                </span>
                <span className='text-sm font-medium mt-1.5'>
                  {grade.label}
                </span>
              </div>
            )}
          </div>
        </Stack>
      </PageContainer>
    </Section>
  );
}
