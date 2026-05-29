import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';

// Approximate widths for the title column so successive rows don't all match
// — a uniform width column reads as a block, not a list.
const TITLE_WIDTHS = [220, 260, 180, 240, 200, 280, 170, 230];

export default function FittedJobsLoading() {
  return (
    <div className='flex flex-col gap-6' aria-label='Loading jobs'>
      {/* Heading "Jobs" (hero h1 ~ text-4xl sm:text-5xl) + subtitle */}
      <div>
        <Skeleton variant='rectangular' width={140} height={40} />
        <div className='mt-2'>
          <Skeleton width={280} size='md' />
        </div>
      </div>

      {/* Target tab strip (border-b, gap-1) — first tab "All Jobs" is shorter
          than the target labels, so vary the widths. */}
      <div className='border-b border-border'>
        <div className='flex gap-1 pb-px'>
          <Skeleton variant='rectangular' width={80} height={36} />
          <Skeleton variant='rectangular' width={210} height={36} />
          <Skeleton variant='rectangular' width={190} height={36} />
        </div>
      </div>

      {/* JobsFilter: search input (full-width row) + filter pills */}
      <div className='flex flex-col gap-2.5'>
        <Skeleton variant='rectangular' className='h-9 w-full' />
        <div className='flex flex-wrap items-center gap-2'>
          <Skeleton
            variant='rectangular'
            width={110}
            height={32}
            className='rounded-full'
          />
          <Skeleton
            variant='rectangular'
            width={130}
            height={32}
            className='rounded-full'
          />
        </div>
      </div>

      {/* Table — mirrors JobsListTable's 8-column structure so column widths
          match the post-load layout and the swap doesn't shift. */}
      <div className='overflow-x-auto'>
        <table className='w-full text-sm' aria-hidden='true'>
          <thead>
            <tr className='border-b border-border text-left'>
              <th className='px-3 py-2 w-10'>
                <Skeleton variant='rectangular' width={16} height={16} />
              </th>
              <th className='px-3 py-2'>
                <Skeleton width={50} size='sm' />
              </th>
              <th className='px-3 py-2'>
                <Skeleton width={50} size='sm' />
              </th>
              <th className='px-3 py-2'>
                <Skeleton width={40} size='sm' />
              </th>
              <th className='px-3 py-2'>
                <Skeleton width={70} size='sm' />
              </th>
              <th className='px-3 py-2'>
                <Skeleton width={56} size='sm' />
              </th>
              <th className='px-3 py-2'>
                <Skeleton width={50} size='sm' />
              </th>
              <th className='px-3 py-2'>
                <Skeleton width={60} size='sm' />
              </th>
            </tr>
          </thead>
          <tbody>
            {TITLE_WIDTHS.map((titleWidth, i) => (
              <tr key={i} className='border-b border-border'>
                <td className='px-3 py-2 w-10'>
                  <Skeleton variant='rectangular' width={16} height={16} />
                </td>
                <td className='px-3 py-2'>
                  <div className='inline-flex items-center gap-1.5'>
                    <Skeleton variant='circular' width={8} height={8} />
                    <Skeleton width={56} size='sm' />
                  </div>
                </td>
                <td className='px-3 py-2'>
                  <Skeleton variant='rectangular' width={36} height={22} />
                </td>
                <td className='px-3 py-2'>
                  <Skeleton width={titleWidth} size='md' />
                </td>
                <td className='px-3 py-2'>
                  <Skeleton width={110} size='md' />
                </td>
                <td className='px-3 py-2'>
                  <Skeleton width={56} size='sm' />
                </td>
                <td className='px-3 py-2'>
                  <Skeleton width={140} size='sm' />
                </td>
                <td className='px-3 py-2'>
                  <Skeleton width={120} size='sm' />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
