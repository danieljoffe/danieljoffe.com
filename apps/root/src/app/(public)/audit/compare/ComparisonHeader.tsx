import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { GRADE_MAP } from '@danieljoffe.com/shared-audit';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import { sectionContainer } from '@/lib/layoutStyles';
import { formatDate } from '@/lib/dateFormatting';

interface ScanSummary {
  id: string;
  url: string;
  grade_overall: string | null;
  completed_at: string | null;
}

interface ComparisonHeaderProps {
  scanA: ScanSummary;
  scanB: ScanSummary;
  deviceMode: 'mobile' | 'desktop';
}

function GradeBadge({ grade }: { grade: string | null }) {
  const info = grade ? GRADE_MAP[grade] : null;
  if (!info) {
    return (
      <span className='inline-flex items-center justify-center size-12 rounded-lg text-xl font-bold text-white bg-surface-elevated'>
        —
      </span>
    );
  }
  return (
    <span
      role='img'
      className='inline-flex items-center justify-center size-12 rounded-lg text-xl font-bold text-white'
      style={{ backgroundColor: info.color }}
      aria-label={`Grade ${info.grade}, ${info.label}`}
    >
      <span aria-hidden='true'>{info.grade}</span>
    </span>
  );
}

function ScanColumn({ label, scan }: { label: string; scan: ScanSummary }) {
  return (
    <div className='flex items-start gap-3 min-w-0'>
      <GradeBadge grade={scan.grade_overall} />
      <div className='min-w-0 flex-1'>
        <Text variant='meta' as='p' className='uppercase tracking-wide'>
          {label}
        </Text>
        <Text variant='body' className='truncate font-medium'>
          {scan.url}
        </Text>
        {scan.completed_at && (
          <Text variant='meta' as='p'>
            {formatDate(scan.completed_at)}
          </Text>
        )}
      </div>
    </div>
  );
}

export default function ComparisonHeader({
  scanA,
  scanB,
  deviceMode,
}: ComparisonHeaderProps) {
  return (
    <section
      className={sectionContainer}
      aria-labelledby='comparison-header-heading'
    >
      <div className='max-w-3xl mx-auto w-full px-4 sm:px-6 py-12 md:py-16'>
        <Link
          href={`/audit/r/${scanB.id}`}
          className='inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface'
        >
          <ArrowLeft className='size-4' aria-hidden='true' />
          Back to report
        </Link>

        <Heading
          variant='section'
          as='h1'
          id='comparison-header-heading'
          className='mt-4'
        >
          Comparison
        </Heading>
        <Text variant='body' className='mt-1'>
          {deviceMode === 'desktop' ? 'Desktop' : 'Mobile'} scans for{' '}
          {scanB.url}
        </Text>

        <div className='mt-6 grid grid-cols-1 md:grid-cols-2 gap-4'>
          <ScanColumn label='Previous' scan={scanA} />
          <ScanColumn label='Current' scan={scanB} />
        </div>
      </div>
    </section>
  );
}
