import { Skeleton } from '@danieljoffe/shared-ui/Skeleton';

// Used by three call sites — the route-level loading.tsx, the JobsListView
// dynamic-import fallback for JobsListTable, and JobsListTable's own
// data-loading branch. Sharing a single skeleton keeps the user from seeing
// the table shape change as it cascades through those states.
//
// Title widths vary by row so successive rows don't read as a block; the rest
// of the columns hold fixed widths so the grid stays stable until the real
// data arrives.
const TITLE_WIDTHS = [220, 260, 180, 240, 200, 280, 170, 230];

export default function JobsTableSkeleton() {
  return (
    <div className='overflow-x-auto' aria-label='Loading jobs'>
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
  );
}
