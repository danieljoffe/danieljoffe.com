import { Card, CardContent, CardHeader } from '@danieljoffe.com/shared-ui/Card';
import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';

function SectionCardSkeleton({ rows = 1 }: { rows?: number }) {
  return (
    <Card>
      <CardHeader>
        <div className='flex items-baseline justify-between gap-2'>
          <Skeleton width={140} height={20} />
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

      <div className='flex items-center gap-3'>
        <Skeleton width={280} height={32} />
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
            <Skeleton width={160} height={20} />
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
