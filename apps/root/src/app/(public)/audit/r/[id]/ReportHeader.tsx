import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Heading } from '@danieljoffe/shared-ui/Heading';
import { Section } from '@danieljoffe/shared-ui/Section';
import { Text } from '@danieljoffe/shared-ui/Text';
import { GRADE_MAP } from '@danieljoffe.com/shared-audit';
import { formatDate } from '@/lib/dateFormatting';
import CompareWithPreviousButton from './CompareWithPreviousButton';
import ExpandableScreenshot from './ExpandableScreenshot';
import ShareButton from './ShareButton';

interface ReportHeaderProps {
  scanId: string;
  url: string;
  pageTitle: string | null;
  screenshotUrl: string | null;
  gradeOverall: string | null;
  completedAt: string | null;
  deviceMode?: 'mobile' | 'desktop';
}

export default function ReportHeader({
  scanId,
  url,
  pageTitle,
  screenshotUrl,
  gradeOverall,
  completedAt,
  deviceMode,
}: ReportHeaderProps) {
  const grade = gradeOverall ? GRADE_MAP[gradeOverall] : null;

  return (
    <Section center overflow='hidden' aria-labelledby='report-header-heading'>
      <div className='flex items-center justify-between'>
        <Link
          href='/audit'
          className='inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors'
        >
          <ArrowLeft className='size-4' aria-hidden='true' />
          New audit
        </Link>
        <div className='flex items-center gap-4'>
          <CompareWithPreviousButton scanId={scanId} />
          <ShareButton scanId={scanId} />
        </div>
      </div>

      <div className='mt-6 flex flex-col gap-6 md:flex-row md:items-start'>
        {/* Mobile: image centered; Tablet+: flush left */}
        <div className='flex justify-center md:justify-start shrink-0'>
          <ExpandableScreenshot
            screenshotUrl={screenshotUrl}
            alt={`Screenshot of ${pageTitle || url}`}
            deviceMode={deviceMode}
          />
        </div>

        {/* Grade + Page data row
              Mobile: grade left, page data right
              Tablet+: page data left, grade flush right */}
        <div className='flex flex-row items-start gap-4 flex-1 min-w-0'>
          {grade && (
            <div
              className='flex flex-col items-center shrink-0 order-first md:order-last'
              aria-label={`Overall grade: ${grade.grade}, ${grade.label}`}
            >
              <span
                className='inline-flex items-center justify-center size-16 rounded-xl text-3xl font-bold text-white'
                style={{ backgroundColor: grade.color }}
              >
                {grade.grade}
              </span>
              <span className='text-sm font-medium mt-1.5'>{grade.label}</span>
            </div>
          )}

          <div className='min-w-0 flex-1'>
            <Heading variant='section' id='report-header-heading'>
              {pageTitle || url}
            </Heading>
            <Text variant='body' className='truncate max-w-md mt-1'>
              {url}
            </Text>
            {completedAt && (
              <Text variant='meta' as='p' className='mt-1'>
                Scanned {formatDate(completedAt)}
              </Text>
            )}
            <Text variant='meta' as='p' className='mt-0.5'>
              {deviceMode === 'desktop'
                ? 'Tested on Desktop (Broadband)'
                : 'Tested on Mobile (4G)'}
            </Text>
          </div>
        </div>
      </div>
    </Section>
  );
}
