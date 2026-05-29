import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';

export default function AppLoading() {
  return (
    <div role='status' aria-label='Loading' className='flex flex-col gap-6'>
      {/* Hero h1 + subtitle. variant='text' size='lg' is h-3..h-5 (~20px);
          the real heading is hero (text-4xl sm:text-5xl ~40-48px), so a
          rectangular placeholder at h=40 lands closer to the actual height. */}
      <div>
        <Skeleton variant='rectangular' width={140} height={40} />
        <Skeleton className='mt-2 w-56' size='md' />
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
