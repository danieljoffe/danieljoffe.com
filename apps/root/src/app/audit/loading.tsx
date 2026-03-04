export default function Loading() {
  return (
    <div
      className='flex min-h-[60vh] items-center justify-center'
      role='status'
      aria-label='Loading audit page'
    >
      <div className='h-8 w-8 animate-spin rounded-full border-4 border-foreground-muted border-t-primary' />
    </div>
  );
}
