import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';

// Mirrors apps/wyrdfold/src/app/(app)/DashboardPage.tsx so the swap from
// skeleton to populated dashboard doesn't shift the pipeline-stats grid or
// the top-matches list. Keep the responsive breakpoints (2 / 3 / 4 / 7
// columns) and the row dimensions in sync if the page layout changes.
export default function DashboardLoading() {
  return (
    <div className='flex flex-col gap-6' aria-label='Loading dashboard'>
      {/* Hero h1 "Dashboard" + body subtitle "Your job search at a glance" */}
      <div>
        <Skeleton variant='rectangular' width={180} height={40} />
        <Skeleton className='mt-2 w-64' size='md' />
      </div>

      {/* Pipeline stats — 7 statuses, reflows 2 / 3 / 4 / 7 cols.
          Each card is icon + caption label + big number. */}
      <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7'>
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className='flex flex-col gap-2 rounded-lg border border-border bg-surface-secondary p-3 sm:gap-2 sm:p-4'
          >
            <div className='flex items-center gap-2'>
              <Skeleton variant='circular' width={16} height={16} />
              <Skeleton width={56} size='sm' />
            </div>
            <Skeleton variant='rectangular' width={32} height={24} />
          </div>
        ))}
      </div>

      {/* Top matches section: h2 component-variant heading + 5 row cards. */}
      <section className='flex flex-col gap-3'>
        <Skeleton variant='rectangular' width={120} height={24} />
        <div className='flex flex-col gap-2'>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className='flex items-start gap-3 rounded-xl border border-border bg-surface-elevated p-3'
            >
              {/* Score badge */}
              <Skeleton variant='rectangular' width={36} height={22} />
              <div className='flex min-w-0 flex-1 flex-col gap-1'>
                {/* Title — varied widths so the column doesn't read as a block. */}
                <Skeleton
                  width={[260, 220, 280, 200, 240][i] ?? 240}
                  size='md'
                />
                {/* Company · Location */}
                <Skeleton width={180} size='sm' />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
