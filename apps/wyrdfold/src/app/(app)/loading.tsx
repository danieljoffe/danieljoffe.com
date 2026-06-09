import { Skeleton } from '@danieljoffe/shared-ui/Skeleton';

export default function AppLoading() {
  return (
    <div role='status' aria-label='Loading' className='flex flex-col gap-6'>
      {/* Hero h1 + subtitle. Real Heading variant='hero' is text-4xl sm:text-5xl
          leading-[1.1] — ~48px content on >=640px viewports. Subtitle is
          variant='body' (text-sm = 14px) with mt-1 (4px) above. We can't pick
          a page-specific title here (this is the layout-level fallback for
          routes without their own loading.tsx), so keep a generic rectangular
          placeholder sized to the desktop hero. */}
      <div>
        <Skeleton variant='rectangular' width={140} height={48} />
        <Skeleton className='mt-1 w-56' height={14} variant='rectangular' />
      </div>
      {/* Generic stacked-card placeholder. Each leaf has its own loading.tsx,
          so this rarely fires; keep it neutral rather than impersonate any
          specific page shape. */}
      <div className='flex flex-col gap-4'>
        <Skeleton variant='rectangular' height={120} />
        <Skeleton variant='rectangular' height={120} />
      </div>
    </div>
  );
}
