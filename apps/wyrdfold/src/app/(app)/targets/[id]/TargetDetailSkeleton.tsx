import { Card, CardContent, CardHeader } from '@danieljoffe.com/shared-ui/Card';
import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';

function SectionCardSkeleton({ rows = 1 }: { rows?: number }) {
  return (
    <Card>
      <CardHeader>
        <div className='flex items-baseline justify-between gap-2'>
          {/* CardTitle is text-sm (~16px) — earlier 20 read taller than real. */}
          <Skeleton width={140} height={16} />
          <Skeleton width={90} height={14} />
        </div>
        <Skeleton width='80%' height={14} className='mt-1' />
      </CardHeader>
      <CardContent className='flex flex-col gap-3'>
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} variant='rectangular' height={72} />
        ))}
      </CardContent>
    </Card>
  );
}

export default function TargetDetailSkeleton() {
  return (
    <div className='flex flex-col gap-4' aria-label='Loading target'>
      <Skeleton width={120} size='sm' />

      {/* Target label heading (hero h1 = text-4xl sm:text-5xl leading-[1.1] →
          ~48px content on >=640px viewports) + Edit pencil button + status
          badge. Title width is a best-guess for a mid-length label; very long
          or very short ones will still cause a small horizontal shift. */}
      <div className='flex items-center gap-3'>
        <Skeleton variant='rectangular' width={280} height={48} />
        <Skeleton variant='rectangular' width={32} height={32} />
        <Skeleton variant='rectangular' width={56} height={20} />
      </div>

      {/* Categories — taller (multiple sub-rows) */}
      <SectionCardSkeleton rows={3} />

      {/* Seniority / Domain / Penalties — single content blocks */}
      <SectionCardSkeleton />
      <SectionCardSkeleton />
      <SectionCardSkeleton />

      {/* Reference JDs */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <Skeleton width={160} height={16} />
            <Skeleton variant='rectangular' width={140} height={32} />
          </div>
        </CardHeader>
        <CardContent className='flex flex-col gap-3'>
          <Skeleton variant='rectangular' height={56} />
          <Skeleton variant='rectangular' height={56} />
        </CardContent>
      </Card>
    </div>
  );
}
